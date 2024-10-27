# Gameboy-Detonation
Javascript Gameboy Emulator embeded into HTML Canvas

# Running the Emulator
In the Emulator folder, there are three html files, all of which access the emulator. The gui_emulator is recommended if you want to use the emulator for fun. The basic_emulator has more debug capabilities, but the user must do and understand significantly more to use it. The fancy_emulator is just the basic_emulator, but it has more styling.

# GUI Emulator
To start the gui_emulator, you have to select the file folder labelled Emulator Data when prompted. After that, follow the directions on the screen. To add a game to the emulator, select the ROM file from anywhere, and it will be copied into the selected Emulator Data directory. Merely copying the ROM in on your own will not work, as the emulator has to set up RAM and Save State files as well. If you copy a ROM file into the directory without registering it it will not appear in emulator dialogues. Forgetting a game does not wipe its RAM, and if you re-register the same ROM, the RAM will be preserved.
To use a controller with the emulator, simply plug it in and setup keybindings. Bindings set within the emulator will affect the GUI setup. Up arrow, down arrow, and enter will always work on the GUI setup regardless of bindings. Controller POV up, POV down, and A will also always work.
It is recommended to make a copy of the Emulator Data folder outside of the emulator and use it from there. If multiple people are using the same emulator, it is recommended for each to have their own Emulator Data folder. DO NOT MODIFY THE EMULATOR DATA FOLDER IN ANY WAY. Unless you know exactly what you are doing, you may render the folder unusable. A backup copy of the Emulator Data folder is highly recommended in case of unforseen glitches.
GUI emulator cannot Save States right now.

# Basic/Fancy Emulators
Using these is slightly more complicated. Mostly, you click the buttons in the order they appear. 'Setup Sound' can be pressed at any point, or not at all. First, select the ROM file, then click 'Engage Explosives.' If you have a RAM file, select it, then press 'Load Ram.' If not, just press "No RAM.' Next, press 'Prepare Fuse.' If you have a Save State, select it with the file picker right before 'Load State,' then press 'Load State.' Finally, press 'Detonate' to begin emulation.
Keybindings are not modifiable--they are always arrow keys, z, x, enter, and shift.