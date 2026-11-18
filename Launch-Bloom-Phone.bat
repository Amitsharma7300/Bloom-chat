@echo off
title Bloom Chat Phone Emulator
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Bloom-Emulator.ps1"
if errorlevel 1 pause
