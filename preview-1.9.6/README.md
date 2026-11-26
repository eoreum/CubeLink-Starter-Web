# CubeLink Starter Web 1.8.0

Public classroom web app with real Blockly interlocking blocks.

https://eoreum.github.io/CubeLink-Starter-Web/

Source and preserved history are managed separately in eoreum/CubeLink-Starter. See THIRD_PARTY_NOTICES.md and vendor/LICENSE.

## AI와 만들기 및 하드웨어 후보

`feature/ai-maker-basic` adds an optional text dialog without replacing the existing classroom UI. It keeps the idea conversation and selected beginner design in local browser storage, recommends basic parts, and applies a confirmed design through the existing Blockly and Arduino C++ generator.

The v1.7.0 candidate separates Upload and Live modes for Uno R3, Nano Classic, and Mega 2560. Before Live mode starts, the bridge checks the selected board for the current CubeLink Starter Live firmware. A matching version is reused without writing flash; missing or mismatched firmware is compiled, uploaded, and verified automatically. Browser Web Serial remains responsible for the 9600 baud monitor. Native compilation and upload are performed by the localhost-only companion in `bridge/`, which invokes the official Arduino CLI with fixed allowlisted board profiles and no command shell. See `bridge/README.md` for setup. This general Arduino teaching bridge is separate from authenticated CubeLink production-hardware access.

Run the dependency-free regression checks with `node --test tests/*.test.mjs`.

Version 1.8 completes browser-driven Live block execution and persistent Windows Bridge installation with automatic startup at login. Existing lessons, Blockly editing, AI maker, code generation, and project storage remain available. The downloadable ZIP is rebuilt from `bridge/`; see its README for first-use device permissions, installation and removal of automatic startup. GitHub Actions checks regression tests and compiles Live firmware for Uno, both Nano bootloaders, and Mega. Physical upload and sensor behavior still require testing with connected boards.


## 1.9.6 candidate — L298N and live servo
Free coding: open the DC 모터 (L298N) category and connect the motor block to setup or loop. Each channel has independently selectable EN (PWM), IN1 and IN2, direction and speed 0–255. Default channel: D5/D7/D8. For a second channel on Uno/Nano use D6/D4/D12. Remove the EN jumper, use a suitable separate motor supply, connect grounds, and add a 10 kΩ pull-down on each EN pin so the driver stays disabled during reset or disconnection. Never power motors from Arduino USB. For direction changes use a stop block and a suitable pause before reverse. No additional Arduino library is required for L298N.
Live firmware 1.2.0 and Bridge 1.3.0 are required. Upgrade the bridge from the included ZIP before connecting. The loopback regression tests mock Arduino CLI; actual firmware compilation and hardware tests remain required. Circuit diagrams for custom DC motor circuits are not included in this candidate.
