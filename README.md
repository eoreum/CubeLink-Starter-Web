# CubeLink Starter Web 1.5.0

Public classroom web app with real Blockly interlocking blocks.

https://eoreum.github.io/CubeLink-Starter-Web/

Source and preserved history are managed separately in eoreum/CubeLink-Starter. See THIRD_PARTY_NOTICES.md and vendor/LICENSE.

## AI와 만들기 (기초 개발 브랜치)

`feature/ai-maker-basic` adds an optional text dialog without replacing the existing classroom UI. It keeps the idea conversation and selected beginner design in local browser storage, recommends basic parts, and applies a confirmed design through the existing Blockly and Arduino C++ generator. Intermediate/advanced design and direct board upload are intentionally out of scope.

Run the dependency-free regression checks with `node --test tests/*.test.mjs`.
