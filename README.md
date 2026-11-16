# CubeLink Starter Web 1.7.0 live-firmware candidate

Public classroom web app with real Blockly interlocking blocks.

https://eoreum.github.io/CubeLink-Starter-Web/

Source and preserved history are managed separately in eoreum/CubeLink-Starter. See THIRD_PARTY_NOTICES.md and vendor/LICENSE.

## AI와 만들기 및 하드웨어 후보

`feature/ai-maker-basic` adds an optional text dialog without replacing the existing classroom UI. It keeps the idea conversation and selected beginner design in local browser storage, recommends basic parts, and applies a confirmed design through the existing Blockly and Arduino C++ generator.

The v1.7.0 candidate separates Upload and Live modes for Uno R3, Nano Classic, and Mega 2560. Before Live mode starts, the bridge checks the selected board for the current CubeLink Starter Live firmware. A matching version is reused without writing flash; missing or mismatched firmware is compiled, uploaded, and verified automatically. Browser Web Serial remains responsible for the 9600 baud monitor. Native compilation and upload are performed by the localhost-only companion in `bridge/`, which invokes the official Arduino CLI with fixed allowlisted board profiles and no command shell. See `bridge/README.md` for setup. This general Arduino teaching bridge is separate from authenticated CubeLink production-hardware access.

Run the dependency-free regression checks with `node --test tests/*.test.mjs`.
