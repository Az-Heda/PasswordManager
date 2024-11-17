#!/bin/bash

cd "$(dirname $0)"
clear

cargo tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc