#include "tjpgd.h"

#include <emscripten/emscripten.h>
#include <emscripten/val.h>
#include <emscripten/bind.h>

#include <iostream>

struct IODevice {
  struct {
    uint8_t *buffer;
    size_t size;
    size_t pos = 0;
  } input;
  std::vector<uint8_t> output;
};

unsigned inFunc(                 // Returns number of bytes read (zero on error)
                JDEC *jd,        // Decompression object
                uint8_t *buff,   // Pointer to the read buffer (null to remove data)
                unsigned nbytes  // Number of bytes to read/remove
) {
  auto &input = static_cast<IODevice *>(jd->device)->input;
  nbytes = std::min(size_t(nbytes), input.size - input.pos);
  if (nbytes) {
    if (buff)
      memcpy(buff, input.buffer + input.pos, nbytes);
    input.pos += nbytes;
  }
  return nbytes;
}

int outFunc(                // 1:Ok, 0:Aborted
            JDEC *jd,       // Decompression object
            void *bitmap,   // Bitmap data to be output
            JRECT *rect     // Rectangular region of output image
)
{
  const auto device = static_cast<IODevice *>(jd->device);
  uint8_t *src, *dst;
  uint16_t y, bws, bwd;

  // Copy the decompressed RGB rectangle to the frame buffer (RGB888 cfg)
  src = static_cast<uint8_t *>(bitmap);
  dst = device->output.data() + 3 * (rect->top * jd->width + rect->left);  // Left-top of destination rectangular
  bws = 3 * (rect->right - rect->left + 1);     // Width of source rectangular [byte]
  bwd = 3 * jd->width;                         // Width of frame buffer [byte]
  for (y = rect->top; y <= rect->bottom; y++) {
    memcpy(dst, src, bws);   // Copy a line
    src += bws; dst += bwd;  // Next line
  }

  return 1;    // Continue to decompress
}

struct TJpgDec {
  size_t decode(emscripten::val input) {
    const auto uint8Array = emscripten::val::global("Uint8Array");
    const auto inputView = uint8Array.new_(input);
    const auto size = inputView["length"].as<size_t>();

    std::vector<uint8_t> data;
    data.resize(size);
    emscripten::val dataView{ emscripten::typed_memory_view(size, data.data()) };
    dataView.call<void>("set", inputView);

    JDEC jdec;
    IODevice device = { {data.data(), data.size()} };
    std::vector<uint8_t> workBuffer(3100);

    if (const auto res = jd_prepare(&jdec, inFunc, workBuffer.data(), workBuffer.size(), &device); res != JDR_OK)
      return res + 1000;
    device.output.resize(3 * jdec.width * jdec.height);

    if (const auto res = jd_decomp(&jdec, outFunc, 0); res != JDR_OK)
      return res;

    result = std::move(device.output);
    width = jdec.width;
    height = jdec.height;
    return 0;
  }
  emscripten::val getResult() const { return emscripten::val{ emscripten::typed_memory_view(result.size(), result.data()) }; }
  size_t getWidth() const { return width; }
  size_t getHeight() const { return height; }

  std::vector<uint8_t> result;
  size_t width, height;
};

EMSCRIPTEN_BINDINGS(my_module) {
  emscripten::class_<TJpgDec>("TJpgDec")
    .constructor<>()
    .function("decode", &TJpgDec::decode)
    .property("width", &TJpgDec::getWidth)
    .property("height", &TJpgDec::getHeight)
    .property("result", &TJpgDec::getResult)
    ;
}