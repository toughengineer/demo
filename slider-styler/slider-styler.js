const version = '20201222';

const defaultSetup = {
  element: {
    height: '0'
  },
  handle: {
    background: {
      color: '#007cf8',
      color2: 'green',
      gradient: false,
      hover: {
        color: '#0061c3'
      },
      active: {
        color: '#2f98f9'
      }
    },
    width: '2em',
    height: '2em',
    borderRadius: '1em',
    border: {
      width: '0',
      color: 'lightgray',
      hover: {
      },
      active: {
      }
    },
    shadow: {
      color: 'black',
      x: '0',
      y: '0',
      blur: '2px',
      spread: '0'
    }
  },
  track: {
    background: {
      color: '#efefef',
      color2: 'green',
      gradient: false,
      hover: {
        color: '#e5e5e5'
      },
      active: {
        color: '#f5f5f5'
      }
    },
    height: '1em',
    borderRadius: '0.5em',
    border: {
      width: '1px',
      color: '#b2b2b2',
      hover: {
        color: '#9a9a9a'
      },
      active: {
        color: '#c1c1c1'
      }
    },
    shadow: {
      color: 'black',
      x: '0',
      y: '0',
      blur: '0',
      spread: '0'
    }
  },
  progress: {
    background: {
      color: '#007cf8',
      color2: 'green',
      gradient: false,
      hover: {
        color: '#0061c3'
      },
      active: {
        color: '#2f98f9'
      }
    }
  }
};

function createColorPicker(selector, color, state = 'enabled') {
  return new Pickr({
    el: selector,
    container: '#controlsContainer',
    theme: 'monolith',
    appClass: 'colorPicker',
    disabled: state == 'disabled',
    outputPrecision: 0,
    comparison: false,
    default: color,
    defaultRepresentation: 'HEX',
    position: 'bottom-start',
    adjustableNumbers: true,

    components: {
      palette: true,
      preview: false,
      opacity: true,
      hue: true,
      interaction: {
        hex: true,
        rgba: true,
        hsla: false,
        hsva: false,
        cmyk: false,

        input: true,
        cancel: false,
        clear: false,
        save: false,
      }
    }
  });
}

function toRGBa(pickr) {
  return pickr.getColor().toHEXA().toString();
}

function generateBackground(color, color2, isGradient) {
  if (isGradient)
    return `linear-gradient(to right, ${color}, ${color2})`;
  return color;
}

class Length {
  constructor(length, unit = 'px') {
    this.length = length;
    this.unit = unit;
  }

  get value() {
    return Length.makeValue(this.length, this.unit);
  }

  static makeValue(length, unit) {
    return length == 0 ? '0' : length + unit;
  }

  static parse(s) {
    if (s == '0')
      return new Length(0);
    const regex = /^(.*)(px|em)$/i;
    const m = regex.exec(s);
    if (m !== null) {
      const length = Number.parseFloat(m[1]);
      if (length != NaN)
        return new Length(length, m[2]);
    }
    throw new Error(`Failed to parse CSS length '${s}'`);
  }
}

function generateBorder(width, color) {
  if (width.length == 0)
    return 'none';
  return width.value + ' solid ' + color;
}

function generateShadow(color, x, y, blur, spread) {
  if (x.length == 0 && y.length == 0 && blur.length == 0 && spread.length == 0)
    return 'none';
  let s = x.value + ' ' + y.value;
  if (spread.length != 0)
    s += ' ' + blur.value + ' ' + spread.value;
  else if (blur.length != 0)
    s += ' ' + blur.value;
  return s + ' ' + color;
}

function evluateWithHook(func, hook) {
  return hook === null ? func() : hook(func);
}
function getEvaluatorWithHook(func, hook) {
  return hook === null ? func : (() => hook(func));
}

function addEventListeners(events, element, handler) {
  if (Array.isArray(events)) {
    for (let name of events)
      element.addEventListener(name, handler);
  }
  else {
    element.addEventListener(events, handler);
  }
}

function setupValidation(rootSelector, property, rawInput, initialValidity = true, hook = null) {
  const validationDisplay = document.querySelector(rootSelector + ' .validationDisplay');
  function setValid(isValid = true) {
    if (isValid)
      validationDisplay.classList.remove('invalid');
    else
      validationDisplay.classList.add('invalid');
  }

  setValid(initialValidity);

  const isValid = () => CSS.supports(property, rawInput.value);
  const validityEvaluator = hook === null ? isValid :
    () => hook(rawInput.value, isValid);
  function checkValidity() {
    setValid(validityEvaluator());
  }

  addEventListeners(['input', 'change'], rawInput, checkValidity);

  return setValid;
}

function dispatchValueChangedEvent(e) {
  e.dispatchEvent(new CustomEvent('valueChanged'));
}

function isFunction(functionToCheck) {
  return functionToCheck && Object.prototype.toString.call(functionToCheck) === '[object Function]';
}

class RawInput {
  constructor(input, updateFunction) {
    if (updateFunction !== null && !isFunction(updateFunction))
      throw TypeError('updateFunction is not a function');
    this.input = input;
    this.updateFunction = updateFunction;
  }
}

function setupBackgroundSection(rootSelector, bg, hook = null) {
  function getColorSafe(name) {
    const color = bg[name];
    if (color !== undefined) {
      return color;
    }
    console.error('Failed to get value \'' + name + '\' for background');
    return '#00ff00';
  }

  const bgPickr = createColorPicker(rootSelector + ' #backgroundColor', getColorSafe('color'));
  const bgPickr2 = createColorPicker(rootSelector + ' #backgroundColor2', getColorSafe('color2'));
  const rootElement = document.querySelector(rootSelector);
  const checkbox = rootElement.querySelector('#gradientCheckbox');
  const rawBackground = rootElement.querySelector('#rawBackground');
  try {
    if (!bg.gradient)
      bgPickr2.disable();
    checkbox.checked = bg.gradient;
    rawBackground.value = evluateWithHook(() => generateBackground(bg.color, bg.color2, bg.gradient), hook);
  }
  catch (e) {
    console.error('Failed to parse values: ' + e);
  }

  const setValid = setupValidation(rootSelector, 'background', rawBackground);

  const valueEvaluator = getEvaluatorWithHook(() => generateBackground(toRGBa(bgPickr), toRGBa(bgPickr2), checkbox.checked), hook);
  function updateRawBackground() {
    const value = valueEvaluator();
    if (rawBackground.value != value) {
      rawBackground.value = value;
      dispatchValueChangedEvent(rawBackground);
      setValid();
    }
  }

  bgPickr.on('change', updateRawBackground);
  bgPickr2.on('change', updateRawBackground);
  const handler = () => {
    updateRawBackground();
    if (checkbox.checked)
      bgPickr2.enable();
    else
      bgPickr2.disable();
  };
  addEventListeners(['change', 'input'], checkbox, handler);

  return new RawInput(rawBackground, updateRawBackground);
}

function getVisibilityCheckbox(rootSelector) {
  const checkboxSelector = rootSelector + ' input[type="checkbox"].visibilityControl';
  const checkbox = document.querySelector(checkboxSelector);
  if (checkbox === null)
    throw new Error('Can\'t find ' + checkboxSelector);
  return checkbox;
}

function setupOverriddenBackgroundSection(rootSelector, bg, defaultBg) {
  const checkbox = getVisibilityCheckbox(rootSelector)

  let newBg;
  if (bg === undefined || bg.color === undefined) {
    checkbox.checked = false;
    newBg = defaultBg;
  }
  else {
    checkbox.checked = true;

    newBg = {
      color: bg.color
    };

    if (bg.color2 === undefined) {
      newBg.color2 = defaultBg.color2;
      newBg.gradient = false;
    }
    else {
      newBg.color2 = bg.color2;
      newBg.graadient = bg.gradient === undefined ? false : bg.gradient;
    }
  }

  const setupResult = setupBackgroundSection(rootSelector, newBg, (value) => (checkbox.checked ? value() : ''));
  checkbox.addEventListener('change', setupResult.updateFunction);

  return setupResult;
}

function setInputStep(input, unit, converValue = false) {
  const emToPixels = 16;
  switch (unit) {
    case 'px':
      if (converValue)
        input.value *= emToPixels;
      input.step = 1;
      break;

    case 'em':
      if (converValue)
        input.value /= emToPixels;
      input.step = 0.1;
      break;
  }
}

function setupLengthUnitChange(amount, unit) {
  unit.addEventListener('change', () => {
    setInputStep(amount, unit.value, true);
  });
}

function setupBorderSection(rootSelector, border, hook = null) {
  function getColorSafe(name) {
    const color = border[name];
    if (color !== undefined) {
      return color;
    }
    console.error('Failed to get value \'' + name + '\' for border');
    return '#ff0000';
  }

  const rootElement = document.querySelector(rootSelector);
  const widthAmount = rootElement.querySelector('#borderWidth');
  const widthUnit = rootElement.querySelector('#borderWidthUnit');
  const borderPickr = createColorPicker(rootSelector + ' #borderColor', getColorSafe('color'));
  const rawBorder = rootElement.querySelector('#rawBorder');

  setupLengthUnitChange(widthAmount, widthUnit);

  try {
    const width = Length.parse(border.width);
    widthAmount.value = width.length;
    widthUnit.value = width.unit;
    setInputStep(widthAmount, width.unit);
    rawBorder.value = evluateWithHook(() => generateBorder(width, border.color), hook);
  }
  catch (e) {
    console.error('Failed to parse values: ' + e);
  }

  const setValid = setupValidation(rootSelector, 'border', rawBorder);

  const valueEvaluator = getEvaluatorWithHook(() => generateBorder(new Length(widthAmount.value, widthUnit.value), toRGBa(borderPickr)), hook);
  function updateRawBorder() {
    const value = valueEvaluator();
    if (rawBorder.value != value) {
      rawBorder.value = value;
      dispatchValueChangedEvent(rawBorder);
      setValid();
    }
  }

  for (let e of [widthAmount, widthUnit])
    addEventListeners(['change', 'input'], e, updateRawBorder);

  borderPickr.on('change', updateRawBorder);

  return new RawInput(rawBorder, updateRawBorder);
}

function setupOverriddenBorderColorSection(rootSelector, border, defaultBorder) {
  function getDefaultColorSafe(name) {
    const color = defaultBorder[name];
    if (color !== undefined) {
      return color;
    }
    console.error('Failed to get value \'' + name + '\' for border');
    return '#ff0000';
  }

  const colorIsPresent = border !== undefined && border.color !== undefined;
  const newColor = colorIsPresent ? border.color : getDefaultColorSafe('color');

  const checkbox = getVisibilityCheckbox(rootSelector);
  checkbox.checked = colorIsPresent;

  const borderPickr = createColorPicker(rootSelector + ' #borderColor', newColor);
  const rawBorderColor = document.querySelector(rootSelector + ' #rawBorderColor');
  rawBorderColor.value = colorIsPresent ? newColor : '';

  const setValid = setupValidation(rootSelector, 'border-color', rawBorderColor);

  function updateRawBorder() {
    const value = checkbox.checked ? toRGBa(borderPickr) : '';
    if (rawBorderColor.value != value) {
      rawBorderColor.value = value;
      dispatchValueChangedEvent(rawBorderColor);
      setValid();
    }
  }

  borderPickr.on('change', updateRawBorder);
  checkbox.addEventListener('change', updateRawBorder);

  return new RawInput(rawBorderColor, updateRawBorder);
}

function setupLengthFieldSection(rootSelector, property, value, fieldNames, hooks = null) {
  const rootElement = document.querySelector(rootSelector);
  const amount = rootElement.querySelector(fieldNames.amount);
  const unit = rootElement.querySelector(fieldNames.unit);
  const raw = rootElement.querySelector(fieldNames.raw);

  setupLengthUnitChange(amount, unit);

  const valueHook = hooks === null ? null : hooks.value;

  try {
    const parsedValue = Length.parse(value);
    amount.value = parsedValue.length;
    unit.value = parsedValue.unit;
    setInputStep(amount, parsedValue.unit);
    raw.value = evluateWithHook(() => parsedValue.value, valueHook);
  }
  catch (e) {
    console.error('Failed to parse value: ' + e);
  }

  const setValid = setupValidation(rootSelector, property, raw, /*valid=*/true, hooks === null ? null : hooks.validation);

  const valueEvaluator = getEvaluatorWithHook(() => Length.makeValue(amount.value, unit.value), valueHook);
  function updateRawValue() {
    const value = valueEvaluator();
    if (raw.value != value) {
      raw.value = value;
      dispatchValueChangedEvent(raw);
      setValid();
    }
  }

  for (let e of [amount, unit])
    addEventListeners(['change', 'input'], e, updateRawValue);

  return new RawInput(raw, updateRawValue);
}

function setupWidthSection(rootSelector, width) {
  return setupLengthFieldSection(
    rootSelector,
    'width',
    width,
    {
      amount: '#width',
      unit: '#widthUnit',
      raw: '#rawWidth'
    }
  );
}

function setupHeightSection(rootSelector, height, hooks) {
  return setupLengthFieldSection(
    rootSelector,
    'height',
    height,
    {
      amount: '#height',
      unit: '#heightUnit',
      raw: '#rawHeight'
    },
    hooks
  );
}

function setupBorderRadiusSection(rootSelector, borderRadius) {
  return setupLengthFieldSection(
    rootSelector,
    'border-radius',
    borderRadius,
    {
      amount: '#borderRadius',
      unit: '#borderRadiusUnit',
      raw: '#rawBorderRadius'
    }
  );
}

function setupShadowSection(rootSelector, shadow) {
  function getColorSafe(name) {
    const color = shadow[name];
    if (color !== undefined) {
      return color;
    }
    console.error('Failed to get value \'' + name + '\' for shadow');
    return '#0000ff';
  }

  const shadowPickr = createColorPicker(rootSelector + ' #shadowColor', getColorSafe('color'));
  const rootElement = document.querySelector(rootSelector);
  const xAmount = rootElement.querySelector('#shadowX');
  const xUnit = rootElement.querySelector('#shadowXUnit');
  const yAmount = rootElement.querySelector('#shadowY');
  const yUnit = rootElement.querySelector('#shadowYUnit');
  const blurAmount = rootElement.querySelector('#shadowBlur');
  const blurUnit = rootElement.querySelector('#shadowBlurUnit');
  const spreadAmount = rootElement.querySelector('#shadowSpread');
  const spreadUnit = rootElement.querySelector('#shadowSpreadUnit');
  const rawShadow = rootElement.querySelector('#rawShadow');

  setupLengthUnitChange(xAmount, xUnit);
  setupLengthUnitChange(yAmount, yUnit);
  setupLengthUnitChange(blurAmount, blurUnit);
  setupLengthUnitChange(spreadAmount, spreadUnit);

  try {
    const x = Length.parse(shadow.x);
    const y = Length.parse(shadow.y);
    const blur = Length.parse(shadow.blur);
    const spread = Length.parse(shadow.spread);
    xAmount.value = x.length;
    xUnit.value = x.unit;
    setInputStep(xAmount, x.unit);
    yAmount.value = y.length;
    yUnit.value = y.unit;
    setInputStep(yAmount, y.unit);
    blurAmount.value = blur.length;
    blurUnit.value = blur.unit;
    setInputStep(blurAmount, blur.unit);
    spreadAmount.value = spread.length;
    spreadUnit.value = spread.unit;
    setInputStep(spreadAmount, spread.unit);
    rawShadow.value = generateShadow(shadow.color, x, y, blur, spread);
  }
  catch (e) {
    console.error('Failed to parse values: ' + e);
  }

  const setValid = setupValidation(rootSelector, 'box-shadow', rawShadow);

  function updateRawShadow() {
    const value = generateShadow(
      toRGBa(shadowPickr),
      new Length(xAmount.value, xUnit.value),
      new Length(yAmount.value, yUnit.value),
      new Length(blurAmount.value, blurUnit.value),
      new Length(spreadAmount.value, spreadUnit.value)
    );
    if (rawShadow.value != value) {
      rawShadow.value = value;
      dispatchValueChangedEvent(rawShadow);
      setValid();
    }
  }

  shadowPickr.on('change', updateRawShadow);
  for (let e of [xAmount, xUnit, yAmount, yUnit, blurAmount, blurUnit, spreadAmount, spreadUnit]) {
    addEventListeners(['change', 'input'], e, updateRawShadow);
  }

  return new RawInput(rawShadow, updateRawShadow);
}


const rawInputs = [];

function addToInputsAndGet(setupResult) {
  rawInputs.push(setupResult);
  return setupResult.input;
}

const inputs = {
  element: {
    height: (() => {
      return addToInputsAndGet(setupHeightSection('#element #height', defaultSetup.element.height, {
        value: (getValue) => {
          const value = getValue();
          return value == '0' ? '' : value;
        },
        validation: (value, isValid) => {
          return value.length == 0 || value == '0' ? true : isValid();
        }
      }))
    })(),
  },
  handle: {
    background: addToInputsAndGet(setupBackgroundSection('#handle #background #normal', defaultSetup.handle.background)),
    width: addToInputsAndGet(setupWidthSection('#handle #width', defaultSetup.handle.width)),
    height: addToInputsAndGet(setupHeightSection('#handle #height', defaultSetup.handle.height)),
    borderRadius: addToInputsAndGet(setupBorderRadiusSection('#handle #borderRadius', defaultSetup.handle.borderRadius)),
    border: addToInputsAndGet(setupBorderSection('#handle #border #normal', defaultSetup.handle.border)),
    shadow: addToInputsAndGet(setupShadowSection('#handle #shadow', defaultSetup.handle.shadow)),
    hover: {
      background: addToInputsAndGet(setupOverriddenBackgroundSection('#handle #background #hover', defaultSetup.handle.background.hover, defaultSetup.handle.background)),
      borderColor: addToInputsAndGet(setupOverriddenBorderColorSection('#handle #border #hover', defaultSetup.handle.border.hover, defaultSetup.handle.border))
    },
    active: {
      background: addToInputsAndGet(setupOverriddenBackgroundSection('#handle #background #active', defaultSetup.handle.background.active, defaultSetup.handle.background)),
      borderColor: addToInputsAndGet(setupOverriddenBorderColorSection('#handle #border #active', defaultSetup.handle.border.active, defaultSetup.handle.border))
    }
  },
  track: {
    background: addToInputsAndGet(setupBackgroundSection('#track #background #normal', defaultSetup.track.background)),
    height: addToInputsAndGet(setupHeightSection('#track #height', defaultSetup.track.height)),
    borderRadius: addToInputsAndGet(setupBorderRadiusSection('#track #borderRadius', defaultSetup.track.borderRadius)),
    border: addToInputsAndGet(setupBorderSection('#track #border #normal', defaultSetup.track.border)),
    shadow: addToInputsAndGet(setupShadowSection('#track #shadow', defaultSetup.track.shadow)),
    hover: {
      background: addToInputsAndGet(setupOverriddenBackgroundSection('#track #background #hover', defaultSetup.track.background.hover, defaultSetup.track.background)),
      borderColor: addToInputsAndGet(setupOverriddenBorderColorSection('#track #border #hover', defaultSetup.track.border.hover, defaultSetup.track.border))
    },
    active: {
      background: addToInputsAndGet(setupOverriddenBackgroundSection('#track #background #active', defaultSetup.track.background.active, defaultSetup.track.background)),
      borderColor: addToInputsAndGet(setupOverriddenBorderColorSection('#track #border #active', defaultSetup.track.border.active, defaultSetup.track.border))
    }
  },
  progress: {
    background: addToInputsAndGet(setupBackgroundSection('#progress #background #normal', defaultSetup.progress.background)),
    hover: {
      background: addToInputsAndGet(setupOverriddenBackgroundSection('#progress #background #hover', defaultSetup.progress.background.hover, defaultSetup.progress.background))
    },
    active: {
      background: addToInputsAndGet(setupOverriddenBackgroundSection('#progress #background #active', defaultSetup.progress.background.active, defaultSetup.progress.background))

    }
  }
};

const cssBlock = document.getElementById('generatedCssBlock');
document.getElementById('stickCssBlockCheckbox').addEventListener('change', function () {
  if (this.checked)
    cssBlock.classList.add('stickyCssBlock');
  else
    cssBlock.classList.remove('stickyCssBlock');
});

const examples = document.getElementById('examples');

const output = document.getElementById('styleDisplay');

const styleElement = document.getElementById('styleElement');

const decomposeStyle = (function () {
  const style = document.createElement('SPAN').style;
  return function (css, propertyNames) {
    style.cssText = css;

    if (!Array.isArray(propertyNames))
      return style.getPropertyValue(propertyNames);

    const result = {};
    for (let name of propertyNames)
      result[name] = style.getPropertyValue(name);
    return result;
  }
})();

function generateStyles() {
  const handleWidth = inputs.handle.width.value;
  const handleHeight = inputs.handle.height.value;

  const trackHeight = inputs.track.height.value;

  const handleBorder = inputs.handle.border.value == 'none' ? null :
    decomposeStyle(`border: ${inputs.handle.border.value};`,
      [
        'border-top-width',
        'border-bottom-width',
        'border-left-width',
        'border-right-width'
      ]);
  const trackBorder = inputs.track.border.value == 'none' ? null : decomposeStyle(`border: ${inputs.track.border.value};`, ['border-top-width', 'border-bottom-width']);

  //handleMarginTop = `max((${trackHeight} - ${trackBorder['border-top-width']} - ${trackBorder['border-bottom-width']}) * 0.5,0px)` +
  //  ` - max(${handleHeight} * 0.5,${handleBorder['border-top-width']})`;

  let needCalc = false;
  let handleMarginTop = '';
  if (trackHeight != '0') {
    if (trackBorder != null) {
      handleMarginTop = `max((${trackHeight} - ${trackBorder['border-top-width']} - ${trackBorder['border-bottom-width']}) * 0.5,0px)`;
    }
    else {
      handleMarginTop = `${trackHeight} * 0.5`;
    }
    needCalc = true;
  }

  let handleMargin2 = '';
  if (handleHeight != '0') {
    handleMargin2 = `${handleHeight} * 0.5`;
    needCalc = true;
  }
  if (handleBorder != null) {
    const handleBorderTopWidth = handleBorder['border-top-width'];
    if (handleMargin2.length == 0)
      handleMargin2 = handleBorderTopWidth;
    else
      handleMargin2 = `max(${handleMargin2},${handleBorderTopWidth})`;
  }

  if (handleMargin2.length != 0) {
    if (handleMarginTop.length == 0)
      handleMarginTop = '-1 * ' + handleMargin2;
    else
      handleMarginTop += ' - ' + handleMargin2;
  }

  if (handleMarginTop.length == 0)
    handleMarginTop = '0';
  else if (needCalc)
    handleMarginTop = 'calc(' + handleMarginTop + ')';

  let s =
    `/*generated with Input range slider CSS style generator (version ${version})
https://toughengineer.github.io/demo/slider-styler*/
input[type=range].styled-slider {
`;

  if (inputs.element.height.value.length != 0)
    s += `  height: ${inputs.element.height.value};
`;

  s +=
    `  -webkit-appearance: none;
}

/*progress support*/
input[type=range].styled-slider.slider-progress {
  --range: calc(var(--max) - var(--min));
  --ratio: calc((var(--value) - var(--min)) / var(--range));
  --sx: calc(0.5 * ${handleWidth} + var(--ratio) * (100% - ${handleWidth}));
}

input[type=range].styled-slider:focus {
  outline: none;
}

/*webkit*/
input[type=range].styled-slider::-webkit-slider-thumb {
  width: ${handleWidth};
  height: ${handleHeight};
  border-radius: ${inputs.handle.borderRadius.value};
  background: ${inputs.handle.background.value};
  border: ${inputs.handle.border.value};
  box-shadow: ${inputs.handle.shadow.value};
  margin-top: ${handleMarginTop};
  -webkit-appearance: none;
}

input[type=range].styled-slider::-webkit-slider-runnable-track {
  height: ${trackHeight};
  border-radius: ${inputs.track.borderRadius.value};
  background: ${inputs.track.background.value};
  border: ${inputs.track.border.value};
  box-shadow: ${inputs.track.shadow.value};
}
`;

  function addRule(selector, ...properties) {
    let style = '';
    for (let p of properties)
      if (p[1].length != 0)
        style += `  ${p[0]}: ${p[1]};\n`;
    if (style.length != 0)
      s += selector + ' {\n' + style + '}\n\n';
  }

  addRule('input[type=range].styled-slider::-webkit-slider-thumb:hover',
    ['background', inputs.handle.hover.background.value],
    ['border-color', inputs.handle.hover.borderColor.value]
  );
  addRule('input[type=range].styled-slider:hover::-webkit-slider-runnable-track',
    ['background', inputs.track.hover.background.value],
    ['border-color', inputs.track.hover.borderColor.value]
  );

  addRule('input[type=range].styled-slider::-webkit-slider-thumb:active',
    ['background', inputs.handle.active.background.value],
    ['border-color', inputs.handle.active.borderColor.value]
  );
  addRule('input[type=range].styled-slider:active::-webkit-slider-runnable-track',
    ['background', inputs.track.active.background.value],
    ['border-color', inputs.track.active.borderColor.value]
  );

  function makeGradientIfNeeded(background) {
    if (CSS.supports('background-color', background))
      return `linear-gradient(${background},${background})`;

    return background;
  }

  const trackProgressBg = makeGradientIfNeeded(inputs.progress.background.value);

  s +=
    `input[type=range].styled-slider.slider-progress::-webkit-slider-runnable-track {
  background: ${trackProgressBg} 0/var(--sx) 100% no-repeat, ${inputs.track.background.value};
}

`;

  function valueOrDefault(value, defaultValue) {
    return value.length == 0 ? defaultValue : value;
  }

  const trackHoverNormalBg = valueOrDefault(inputs.track.hover.background.value, inputs.track.background.value);

  let trackProgressHoverBg = inputs.progress.hover.background.value;
  if (trackProgressHoverBg.length != 0 || inputs.track.hover.background.value.length != 0) {
    trackProgressHoverBg = makeGradientIfNeeded(valueOrDefault(trackProgressHoverBg, inputs.progress.background.value));

    s +=
      `input[type=range].styled-slider.slider-progress:hover::-webkit-slider-runnable-track {
  background: ${trackProgressHoverBg} 0/var(--sx) 100% no-repeat, ${trackHoverNormalBg};
}

`;
  }

  const trackActiveNormalBg = valueOrDefault(inputs.track.active.background.value, trackHoverNormalBg);

  let trackProgressActiveBg = inputs.progress.active.background.value;
  if (trackProgressActiveBg.length != 0 || inputs.track.active.background.value.length != 0) {
    trackProgressActiveBg = makeGradientIfNeeded(valueOrDefault(trackProgressActiveBg, trackProgressHoverBg));

    s +=
      `input[type=range].styled-slider.slider-progress:active::-webkit-slider-runnable-track {
  background: ${trackProgressActiveBg} 0/var(--sx) 100% no-repeat, ${trackActiveNormalBg};
}

`;
  }

  function getAdjustedLength(baseLength, decomposedBborder, ...properties) {
    return baseLength == '0' || decomposedBborder === null ? baseLength :
      `max(calc(${baseLength} - ${decomposedBborder[properties[0]]} - ${decomposedBborder[properties[1]]}),0px)`;
  }

  const adjustedHandleWidth = getAdjustedLength(handleWidth, handleBorder, 'border-left-width', 'border-right-width');
  const adjustedHandleHeight = getAdjustedLength(handleHeight, handleBorder, 'border-top-width', 'border-bottom-width');
  const adjustedTrackHeight = getAdjustedLength(trackHeight, trackBorder, 'border-top-width', 'border-bottom-width');

  s +=
    `/*mozilla*/
input[type=range].styled-slider::-moz-range-thumb {
  width: ${adjustedHandleWidth};
  height: ${adjustedHandleHeight};
  border-radius: ${inputs.handle.borderRadius.value};
  background: ${inputs.handle.background.value};
  border: ${inputs.handle.border.value};
  box-shadow: ${inputs.handle.shadow.value};
}

input[type=range].styled-slider::-moz-range-track {
  height: ${adjustedTrackHeight};
  border-radius: ${inputs.track.borderRadius.value};
  background: ${inputs.track.background.value};
  border: ${inputs.track.border.value};
  box-shadow: ${inputs.track.shadow.value};
}

`;

  addRule('input[type=range].styled-slider::-moz-range-thumb:hover',
    ['background', inputs.handle.hover.background.value],
    ['border-color', inputs.handle.hover.borderColor.value]
  );
  addRule('input[type=range].styled-slider:hover::-moz-range-track',
    ['background', inputs.track.hover.background.value],
    ['border-color', inputs.track.hover.borderColor.value]
  );

  addRule('input[type=range].styled-slider::-moz-range-thumb:active',
    ['background', inputs.handle.active.background.value],
    ['border-color', inputs.handle.active.borderColor.value]
  );
  addRule('input[type=range].styled-slider:active::-moz-range-track',
    ['background', inputs.track.active.background.value],
    ['border-color', inputs.track.active.borderColor.value]
  );

  s +=
    `input[type=range].styled-slider.slider-progress::-moz-range-track {
  background: ${trackProgressBg} 0/var(--sx) 100% no-repeat, ${inputs.track.background.value};
}

`;

  if (trackProgressHoverBg.length != 0) {
    s +=
      `input[type=range].styled-slider.slider-progress:hover::-moz-range-track {
  background: ${trackProgressHoverBg} 0/var(--sx) 100% no-repeat, ${trackHoverNormalBg};
}

`;
  }

  if (trackProgressActiveBg.length != 0) {
    s +=
      `input[type=range].styled-slider.slider-progress:active::-moz-range-track {
  background: ${trackProgressActiveBg} 0/var(--sx) 100% no-repeat, ${trackActiveNormalBg};
}

`;
  }

  s +=
    `/*ms*/
input[type=range].styled-slider::-ms-fill-upper {
  background: transparent;
  border-color: transparent;
}

input[type=range].styled-slider::-ms-fill-lower {
  background: transparent;
  border-color: transparent;
}

input[type=range].styled-slider::-ms-thumb {
  width: ${handleWidth};
  height: ${handleHeight};
  border-radius: ${inputs.handle.borderRadius.value};
  background: ${inputs.handle.background.value};
  border: ${inputs.handle.border.value};
  box-shadow: ${inputs.handle.shadow.value};
  margin-top: 0;
  box-sizing: border-box;
}

input[type=range].styled-slider::-ms-track {
  height: ${trackHeight};
  border-radius: ${inputs.track.borderRadius.value};
  background: ${inputs.track.background.value};
  border: ${inputs.track.border.value};
  box-shadow: ${inputs.track.shadow.value};
  box-sizing: border-box;
}

`;

  addRule('input[type=range].styled-slider::-ms-thumb:hover',
    ['background', inputs.handle.hover.background.value],
    ['border-color', inputs.handle.hover.borderColor.value]
  );

  addRule('input[type=range].styled-slider:hover::-ms-track',
    ['background', inputs.track.hover.background.value],
    ['border-color', inputs.track.hover.borderColor.value]
  );

  addRule('input[type=range].styled-slider::-ms-thumb:active',
    ['background', inputs.handle.active.background.value],
    ['border-color', inputs.handle.active.borderColor.value]
  );

  addRule('input[type=range].styled-slider:active::-ms-track',
    ['background', inputs.track.active.background.value],
    ['border-color', inputs.track.active.borderColor.value]
  );

  const trackBorderWidth = inputs.track.border.value == 'none' ? '0' : decomposeStyle(`border: ${inputs.track.border.value};`, [
    'border-top-width',
    'border-bottom-width',
    'border-left-width'
  ]);
  const trackBorderRadius = decomposeStyle(`border-radius: ${inputs.track.borderRadius.value};`, ['border-top-left-radius', 'border-bottom-left-radius']);

  s +=
    `input[type=range].styled-slider.slider-progress::-ms-fill-lower {
  height: ${adjustedTrackHeight};
  border-radius: ${trackBorderRadius['border-top-left-radius']} 0 0 ${trackBorderRadius['border-bottom-left-radius']};
  margin: -${trackBorderWidth['border-top-width']} 0 -${trackBorderWidth['border-bottom-width']} -${trackBorderWidth['border-left-width']};
  background: ${inputs.progress.background.value};
  border: ${inputs.track.border.value};
  border-right-width: 0;
}

`;

  addRule('input[type=range].styled-slider.slider-progress:hover::-ms-fill-lower',
    ['background', inputs.progress.hover.background.value],
    ['border-color', inputs.track.hover.borderColor.value]
  );

  addRule('input[type=range].styled-slider.slider-progress:active::-ms-fill-lower',
    ['background', inputs.progress.active.background.value],
    ['border-color', inputs.track.active.borderColor.value]
  );

  output.textContent = s;

  styleElement.innerHTML = s;

  examples.style.top = `min(0px,calc(20% - ${examples.getBoundingClientRect().height}px))`;
}
generateStyles();

const throttlePeriod = 100;  // no more often than 50ms
let nextUpdateTime = performance.now();
let updateScheduled = false;

function generateStylesThrottled() {
  const now = performance.now();
  const leftTillNextUpdate = nextUpdateTime - now;
  if (leftTillNextUpdate <= 0) {
    generateStyles();
    nextUpdateTime = now + throttlePeriod;
  }
  else if (!updateScheduled) {
    setTimeout(() => {
      generateStyles();
      updateScheduled = false;
    }, leftTillNextUpdate);
    updateScheduled = true;
  }
}

for (let e of rawInputs) {
  addEventListeners(['change', 'input', 'valueChanged'], e.input, generateStylesThrottled);
}

function setupCopyButton(buttonID, element) {
  const button = document.getElementById(buttonID);
  const onFail = (e) => {
    button.classList.add('not-copied');
    void button.offsetWidth; // triggers animation transitions
    button.classList.remove('not-copied');
    console.log('Failed to copy to clipboard: ', e);
  };
  button.addEventListener('click', (event) => {
    try {
      navigator.clipboard.writeText(element.textContent)
        .then(
          () => {
            button.classList.add('copied');
            void button.offsetWidth; // triggers animation transitions
            button.classList.remove('copied');
          },
          onFail
        );
    }
    catch (e) {
      onFail(e.message);
    }
  });
}

setupCopyButton('copyClassStyledSliderButton', document.getElementById('classStyledSlider'));
setupCopyButton('copyClassStyledSliderProgressButton', document.getElementById('classStyledSliderProgress'));

setupCopyButton('copyCssButton', output);

document.getElementById('downloadCssLink').onclick = () => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(styleElement.textContent));
  element.setAttribute('download', 'range-input.css');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

setupCopyButton('copyJSButton', document.getElementById('scriptDisplay'));
