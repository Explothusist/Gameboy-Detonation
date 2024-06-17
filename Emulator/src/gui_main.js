document.getElementById("app").innerHTML = `
<h1>Detonation Emulation</h1>
`;

let app = document.getElementById("app");
let title = document.getElementById("top");
let begin = document.getElementById("begin");
let reset = document.getElementById("reset");
let saveram = document.getElementById("saveram");


let m_canv = document.getElementById("display");
m_canv.outerHTML = "<canvas width='" + (160 * scale).toString() + "' height='" + (144 * scale).toString() + "' id='display'></canvas>";
m_canv = document.getElementById("display");
let m_ctx = m_canv.getContext("2d");
m_ctx.fillStyle = "#FF0000";
m_ctx.fillRect(0, 0, 160 * scale, 144 * scale);

class Menu {

    constructor(title, entries, entry_effects, entry_args) {
        this.title = title;
        this.entries = entries;
        this.entry_effects = entry_effects;
        this.entry_args = entry_args;

        this.selected = 0;
        this.next_key_grabbed = false;
        this.on_next_key = function() {};
    }
    draw_self() {
        m_ctx.fillStyle = "rgb(200, 200, 200)";
        m_ctx.fillRect(0, 0, 160*scale, 144*scale);

        if (this.entries.length < 8) {
            m_ctx.fillStyle = "rgb(0, 0, 0)";
            m_ctx.font = (6*scale)+"px Courier New";
            let text = this.title.split("\n");
            for (let i = 0; i < text.length; i++) {
                m_ctx.fillText(text[i], 16*scale, (24+(i*8))*scale);
            }

            for (let i = 0; i < this.entries.length; i++) {
                if (i === this.selected) {
                    m_ctx.fillStyle = "rgb(150, 150, 150)";
                    m_ctx.fillRect(32*scale, (40+(i*12))*scale, 96*scale, 10*scale);
                }
                m_ctx.fillStyle = "rgb(0, 0, 0)";
                m_ctx.fillText(this.entries[i], 34*scale, (47+(i*12))*scale);
            }
        }else {
            for (let i = 0; i < this.entries.length; i++) {
                if (i === this.selected) {
                    m_ctx.fillStyle = "rgb(150, 150, 150)";
                    m_ctx.fillRect(32*scale, (16+(i*12))*scale, 96*scale, 10*scale);
                }
                m_ctx.fillStyle = "rgb(0, 0, 0)";
                m_ctx.fillText(this.entries[i], 34*scale, (23+(i*12))*scale);
            }
        }
    }
    key_handle(key) {
        if (!this.next_key_grabbed) {
            if (key === "ArrowUp") {
                this.selected -= 1;
                if (this.selected < 0) {
                    this.selected = this.entries.length-1;
                }
            }else if (key === "ArrowDown") {
                this.selected += 1;
                if (this.selected >= this.entries.length) {
                    this.selected = 0;
                }
            }else if (key === "Enter") {
                if (this.entry_args[this.selected].none === true) {
                    this.entry_effects[this.selected]();
                }else {
                    this.entry_effects[this.selected](this.entry_args[this.selected]);
                }
            }
        }else {
            this.on_next_key(key);
        }
    }
};

let m_menu = new Menu();



function do_nothing() {};
// Prepare functions (for cross-reference)
// Screens
function setup_need_directory() {};
function setup_main_menu() {};
function setup_load_game() {};
function setup_register_rom() {};
function setup_keybindings() {};
function setup_edit_game() {};
function setup_select_game() {};
function setup_writing_file() {};
function setup_reading_file() {};
// Actions
function open_directory() {};
function get_all_files() {};
function get_all_files_pt2() {};
function read_directory() {};
function load_game() {};
function load_game_pt2() {};
function start_game() {};
function select_rom() {};
function select_rom_pt2() {};
function add_registered_game() {};
function add_registered_game_pt2() {};
function add_registered_game_pt3() {};
function forget_all() {};
function forget_game() {};
function wipe_game_ram() {};
function trigger_set_keybind() {};
function set_keybind() {};
function save_keybinds() {};

function relinquish_control() {};


let data_dir_source = document.getElementById("data_dir");

let gui_has_control = false;
let save_loop;

let data_dir_fileHandles = [];
let data_dir_files = [];
let registered_games = [];
//{name: "Zelda - Link's Awakening", rom_path: "Legend of Zelda, The - Link's Awakening (USA, Europe).gb", ram_path: "ZELDA.gbram", save_state: ["ZELDA_1.gbstate", "ZELDA_2.gbstate", "ZELDA_3.gbstate", "ZELDA_4.gbstate"]}
// keybindings (from cpu_functions)
let temp_keybind = Array.from(keybindings);

let rom_path = "";
let ram_path = "";

let m_rom = undefined;
let m_ram = undefined;
let rom_ready = false;
let ram_ready = false;
let romname = "";
let alphabet = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z"
];
let numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

let new_rom = undefined;
let new_game = {};
let ram_size = 1;

let ram_not_trusted = false;

let RAMFileHandle;

let DirectoryHandle;

// data_dir_source.addEventListener("change", function () {
//     data_dir_files = this.files;
//     setup_main_menu();
// });
// data_dir_source.addEventListener(
//     "change",
//     (event) => {
//         for (const file of event.target.files) {
//             data_dir_files.push(file);
//         }
//         read_directory();
//         setup_main_menu();
//     },
//     false,
// );

function get_file(filename) {
    for (let file of data_dir_files) {
        if (file.name === filename) {
            return file;
        }
    }
    return "no such file";
};



setup_need_directory = function() {
    m_menu = new Menu("Welcome! Please select the emulator\n    data directory.", ["Select Directory"], [open_directory], [{none:true}]);
};
setup_main_menu = function() {
    m_menu = new Menu("Welcome! Select an action.", ["Load Game", "Register New ROM", "Edit Existing Game", "Forget All Games", "Keybindings"], 
        [setup_load_game, setup_register_rom, setup_edit_game, forget_all, setup_keybindings], [{none:true}, {none:true}, {none:true}, {none:true}, {none:true}]);
};
setup_load_game = function() {
    let game_names = [];
    let game_actions = [];
    let game_args = [];
    for (let i = 0; i < registered_games.length; i++) {
        game_names.push(registered_games[i].name);
        game_actions.push(load_game);
        game_args.push({game_id:i});
    }
    game_names.push("Back");
    game_actions.push(setup_main_menu);
    game_args.push({none:true});
    m_menu = new Menu("Select a game to load.", game_names, game_actions, game_args);
};
setup_register_rom = function() {
    m_menu = new Menu("Register New ROM.", ["Select ROM File", "Name: ", "Cancel", "Save"], [select_rom, do_nothing, setup_main_menu, add_registered_game], 
        [{none:true}, {none:true}, {none:true}, {none:true}]);
};
setup_edit_game = function() {
    m_menu = new Menu("Select and action.", ["Wipe RAM", "Forget Game"], [setup_select_game, setup_select_game], [{wipe_ram: true, forget: false}, {wipe_ram: false, forget: true}]);
};
setup_select_game = function(args) {
    let action = undefined;
    let text_end = "";
    if (args.wipe_ram) {
        action = wipe_game_ram;
        text_end = "wipe RAM.";
    }else if (args.forget) {
        action = forget_game;
        text_end = "forget.";
    }
    let game_names = [];
    let game_actions = [];
    let game_args = [];
    for (let i = 0; i < registered_games.length; i++) {
        game_names.push(registered_games[i].name);
        game_actions.push(action);
        game_args.push({game_id:i});
    }
    game_names.push("Back");
    game_actions.push(setup_main_menu);
    game_args.push({none:true});
    m_menu = new Menu("Select a game to "+text_end, game_names, game_actions, game_args);
};
setup_keybindings = function(selected=0) {
    m_menu = new Menu("Keybindings.", ["Left: "+temp_keybind[0], "Down: "+temp_keybind[1], "Right: "+temp_keybind[2], "Up: "+temp_keybind[3], "B: "+temp_keybind[4], "A: "+temp_keybind[5], "Start: "+temp_keybind[6], "Select: "+temp_keybind[7], "Cancel", "Save"], 
        [trigger_set_keybind, trigger_set_keybind, trigger_set_keybind, trigger_set_keybind, trigger_set_keybind, trigger_set_keybind, trigger_set_keybind, trigger_set_keybind, setup_main_menu, save_keybinds], 
        [{bind_to: 0}, {bind_to: 1}, {bind_to: 2}, {bind_to: 3}, {bind_to: 4}, {bind_to: 5}, {bind_to: 6}, {bind_to: 7}, {none:true}, {none:true}]);
    m_menu.selected = selected;
};
setup_writing_file = function() {
    m_menu = new Menu("Writing file, please wait.\nThis may take a while.", [], [], []);
};
setup_reading_file = function() {
    m_menu = new Menu("Reading files, please wait.\nThis may take a while.", [], [], []);
};

open_directory = function() {
    // setup_reading_file();
    onDirectoryFileHandleLoad = function(handle) {
        DirectoryHandle = handle;
        get_all_files();
    };
    getDirectoryFileHandle();
};
get_all_files = function() {
    onAllFileHandleLoad = function(fileHandles) {
        data_dir_files = fileHandles;
        get_all_files_pt2();
        read_directory();
        setup_main_menu();
    };
    getAllFileHandle(DirectoryHandle);
};
// get_all_files_pt2 = function() {
//     onFileHandlesToFilesLoad = function(files) {
//         data_dir_files = files;
//         read_directory();
//         setup_main_menu();
//     };
//     FileHandlesToFiles(data_dir_fileHandles);
// };
read_directory = function() {
    let reg_games_file = get_file("registered_games.txt");
    if (reg_games_file === "no such file") {
        saveInDirectoryComplete = function() {};
        createFileInDirectory(DirectoryHandle, "Emulator Settings", "registered_games.txt", "");
    }else {
        let reg_games_reader = new FileReader();
        reg_games_reader.onload = function () {
            let games = this.result.split("\n");
            for (let i = 0; i < games.length; i++) {
                registered_games.push(JSON.parse(games[i]));
            }
        };
        reg_games_reader.readAsText(reg_games_file);
    }
    let keybind_file = get_file("keybindings.txt");
    if (keybind_file === "no such file") {
        saveInDirectoryComplete = function() {};
        createFileInDirectory(DirectoryHandle, "Emulator Settings", "keybindings.txt", "");
    }else {
        let keybind_reader = new FileReader();
        keybind_reader.onload = function () {
            let keys = this.result.split("\n");
            for (let i = 0; i < keys.length; i++) {
                keybindings[i] = keys[i];
                temp_keybind[i] = keys[i];
            }
        };
        keybind_reader.readAsText(keybind_file);
    }
};
function read_romname(rom) {
    romname = "";
    for (let i = 0x0134; i < 0x0143; i++) {
        if (rom[i] === 32 || rom[i] === 0) {
            romname += " ";
        } else if (rom[i] < 65) {
            romname += numbers[rom[i] - 48];
        } else {
            romname += alphabet[rom[i] - 65];
        }
    }
    let new_name = "";
    let space = false;
    for (let i = 0; i < romname.length; i++) {
        if (romname[i] !== " ") {
            if (space) {
                new_name += " ";
                space = false;
            }
            new_name += romname[i];
        }else {
            space = true;
        }
    }
    romname = new_name;
};
function read_ram_size(rom) {
    let ram_size = rom[0x149];
    switch (ram_size) {
        case 0:
            return 0;
        case 1:
            return 1;
        case 2:
            return 1;
        case 3:
            return 4;
        case 4:
            return 16;
    }
};
function load_ram_data(ram) {
    let counter = 0;
    for (let i = 0; i < ram_size; i++) {
        for (var j = 0; j < rambanks[i].length; j++) {
            rambanks[i][j] = ram[counter];
            counter += 1;
        }
    }
    XA000 = rambanks[rambank];
};
function save_current_RAM() {
    let any_non_zero = false;
    for (let i = 0; i < m_ram.length; i++) {
        if (m_ram[i] !== 0) {
            any_non_zero = true;
        }
    }
    console.log(any_non_zero);
    if (!any_non_zero) {
        ram_not_trusted = true;
        console.log("RAM Data read as blank for unknown reason. Autosave disabled until RAM is saved manually. If you do not know why the RAM is blank, reload the page and try again");
        alert("RAM Data read as blank for unknown reason. Autosave disabled until RAM is saved manually. If you do not know why the RAM is blank, reload the page and try again");
    }
    if (!ram_not_trusted) {
        let to_save = [];
        rambanks[pram] = XA000;
        for (let i = 0; i < Math.min(rambanks.length, ram_size); i++) {
            to_save.push(rambanks[i]);
        }
        writeFile(RAMFileHandle, to_save);
    }
};
load_game = function(args) {
    // alert("Select "+registered_games[args.game_id].ram_path+" in /Emulator Data/Save_RAM/");
    // getFileHandle();
    // onFileHandleLoad = function(handle) {
    //     RAMFileHandle = handle;
    //     save_current_RAM();
    //     load_game_pt2(args);
    // };
    setup_reading_file();
    onFileFromDirLoad = function(fileHandle) {
        RAMFileHandle = fileHandle;
        save_current_RAM();
        load_game_pt2(args);
    };
    getFileHandleFromDirectoryHandle(DirectoryHandle, "Save_RAM", registered_games[args.game_id].ram_path);
};
load_game_pt2 = function(args) {
    relinquish_control();

    rom_path = registered_games[args.game_id].rom_path;
    ram_path = registered_games[args.game_id].ram_path;
    ram_size = registered_games[args.game_id].ram_size;
    let rom_file = get_file(rom_path);
    let ram_file = get_file(ram_path);

    const rom_reader = new FileReader();
    rom_reader.onload = function () {
        m_rom = new Uint8Array(this.result);
        read_romname(m_rom);
        title.innerHTML = "DE: " + romname;
        app.innerHTML = " <h1>" + romname + "</h1>";
        rom_ready = true;
        start_game();
    };
    rom_reader.readAsArrayBuffer(rom_file);
    const ram_reader = new FileReader();
    ram_reader.onload = function () {
        m_ram = new Uint8Array(this.result);
        let any_non_zero = false;
        for (let i = 0; i < m_ram.length; i++) {
            if (m_ram[i] !== 0) {
                any_non_zero = true;
            }
        }
        console.log(any_non_zero);
        if (any_non_zero) {
            load_ram_data(m_ram);
        }else {
            ram_not_trusted = true;
            console.log("RAM Data read as blank for unknown reason. Autosave disabled until RAM is saved manually. If you do not know why the RAM is blank, reload the page and try again");
            alert("RAM Data read as blank for unknown reason. Autosave disabled until RAM is saved manually. If you do not know why the RAM is blank, reload the page and try again");
        }
        ram_ready = true;
        start_game();
    };
    ram_reader.readAsArrayBuffer(ram_file);
};
start_game = function() {
    if (rom_ready && ram_ready) {
        prepare_cpu(m_rom);
        begin.innerHTML = "Pause";
        beginLoop();

        save_loop = setInterval(save_current_RAM, 5000);
    }
};
select_rom = function() {
    setup_reading_file();
    onROMload = function(file) {
        new_rom = file;
        select_rom_pt2();
    };
    getROM();
};
select_rom_pt2 = function() {
    if (new_rom != undefined) {
        let rom_reader = new FileReader();
        rom_reader.onload = function () {
            new_game = {name: "", rom_path: new_rom.name, ram_path:  "", save_state: ["", "", "", "",], ram_size: 1};
            new_rom = new Uint8Array(this.result);
            read_romname(new_rom);
            m_menu.entries[1] = "Name: "+romname;
            new_game.ram_path = romname+".gbram";
            new_game.save_state[0] = romname+"_1.bgstate";
            new_game.save_state[1] = romname+"_2.bgstate";
            new_game.save_state[2] = romname+"_3.bgstate";
            new_game.save_state[3] = romname+"_4.bgstate";
            new_game.name = romname;
            new_game.ram_size = read_ram_size(new_rom);
        };
        rom_reader.readAsArrayBuffer(new_rom);
    }
};
add_registered_game = function() {
    let rom_file = get_file(new_game.rom_path);
    if (rom_file === "no such file") {
        // alert("Place this file in /Emulator Data/ROMs/ and call it "+new_game.rom_path);
        // onSaveEnd = function() {
        //     add_registered_game_pt2();
        // };
        // saveROM([new_rom]);
        setup_writing_file();
        saveInDirectoryComplete = function() {
            add_registered_game_pt2();
        };
        createFileInDirectory(DirectoryHandle, "ROMs", new_game.rom_path, [new_rom]);
    }else {
        add_registered_game_pt2();
    }
};
add_registered_game_pt2 = function() {
    let ram_file = get_file(new_game.ram_path);
    if (ram_file === "no such file") {
        // alert("Place this file in /Emulator Data/Save_RAM/ and call it "+new_game.ram_path);
        // onSaveEnd = function() {
        //     add_registered_game_pt3();
        // };
        // saveRAM(new Uint8Array(0x2000 * 16));
        saveInDirectoryComplete = function() {
            add_registered_game_pt3();
        };
        createFileInDirectory(DirectoryHandle, "Save_RAM", new_game.ram_path, new Uint8Array(0x2000 * new_game.ram_size));
    }else {
        add_registered_game_pt3();
    }
};
add_registered_game_pt3 = function() {
    registered_games.push(new_game);
    let to_save = "";
    for (let i = 0; i < registered_games.length; i++) {
        to_save += JSON.stringify(registered_games[i]);
        if (i !== registered_games.length-1) {
            to_save += "\n";
        }
    }
    // alert("Select registered_games.txt in /Emulator Data/Emulator Settings/");
    // onSaveEnd = function() {};
    // saveText(to_save);
    saveInDirectoryComplete = function() {
        setup_main_menu();
    };
    saveToFileInDirectory(DirectoryHandle, "Emulator Settings", "registered_games.txt", to_save);
};
forget_all = function() {
    registered_games = [];
    // alert("Select registered_games.txt in /Emulator Data/Emulator Settings/");
    // onSaveEnd = function() {};
    // saveText("");
    setup_writing_file();
    saveInDirectoryComplete = function() {};
    saveToFileInDirectory(DirectoryHandle, "Emulator Settings", "registered_games.txt", "");
};
forget_game = function(args) {
    registered_games.splice(args.game_id, 1);
    // alert("Select registered_games.txt in /Emulator Data/Emulator Settings/");
    // onSaveEnd = function() {};
    let to_save = "";
    for (let i = 0; i < registered_games.length; i++) {
        to_save += JSON.stringify(registered_games[i]);
        if (i !== registered_games.length-1) {
            to_save += "\n";
        }
    }
    // saveText(to_save);
    setup_writing_file();
    saveInDirectoryComplete = function() {
        setup_main_menu();
    };
    saveToFileInDirectory(DirectoryHandle, "Emulator Settings", "registered_games.txt", to_save);
};
wipe_game_ram = function(args) {
    // alert("Select "+registered_games[args.game_id].ram_path+" in /Emulator Data/Save_RAM/");
    // onSaveEnd = function() {};
    // saveRAM(new Uint8Array(0x2000 * 16));
    setup_writing_file();
    saveInDirectoryComplete = function() {
        setup_main_menu();
    };
    saveToFileInDirectory(DirectoryHandle, "Save_RAM", registered_games[args.game_id].ram_path, new Uint8Array(0x2000 * ram_size));
};
let bind_slot = 0;
trigger_set_keybind = function(args) {
    bind_slot = args.bind_to;
    m_menu.next_key_grabbed = true;
    m_menu.on_next_key = set_keybind;
};
set_keybind = function(key) {
    temp_keybind[bind_slot] = key;
    setup_keybindings(m_menu.selected);
};
save_keybinds = function() {
    keybindings = Array.from(temp_keybind);
    let to_save = "";
    for (let i in keybindings) {
        to_save += keybindings[i];
        if (i !== keybindings.length-1) {
            to_save += "\n";
        }
    }
    // alert("Select keybindings.txt in /Emulator Data/Emulator Settings/");
    // saveText(to_save);
    setup_writing_file();
    saveInDirectoryComplete = function() {
        setup_main_menu();
    };
    saveToFileInDirectory(DirectoryHandle, "Emulator Settings", "keybindings.txt", to_save);
};

let go = 3;
begin.onclick = function () {
    if (!gui_has_control) {
        if (go === 2) {
            go = 3;
            begin.innerHTML = "Pause";
            beginLoop();
            save_loop = setInterval(save_current_RAM, 10000);
        } else if (go === 3) {
            go = 2;
            begin.innerHTML = "Resume";
            endLoop();
            save_current_RAM();
            clearInterval(save_loop);
        }
    }
};
reset.onclick = function () {
    if (!gui_has_control) {
        cpu_reset();
        memory_reset();
    }
};
saveram.onclick = function() {
    if (!gui_has_control) {
        ram_not_trusted = false;
        save_current_RAM();
    }
};

document.addEventListener("keyup", function (event) {
    if (gui_has_control) {
        let key = event.key;
        if (!menubar.next_key_grabbed) {
            if (key === keybindings[3] && key !== "Enter" && key !== "ArrowDown") {
                key = "ArrowUp";
            }else if (key === keybindings[1] && key !== "Enter" && key !== "ArrowUp") {
                key = "ArrowDown";
            }else if (key === keybindings[6] && key !== "ArrowDown" && key !== "ArrowUp") {
                key = "Enter";
            }
        }
        if (key === "ArrowUp" || key === "ArrowDown" || key === "Enter" || m_menu.next_key_grabbed) {
            event.preventDefault();
            m_menu.key_handle(key);
        }
    }
});

function maintain_control() {
    let events = get_gamepad_events();
    for (let event of events) {
        if (event.new_state === false) {
            let keybind = "J"+event.button.padStart(2, "0");
            if (!m_menu.next_key_grabbed) {
                let key = "";
                if (keybind === keybindings[3] || keybind === "J12") {
                    key = "ArrowUp";
                }else if (keybind === keybindings[1] || keybind === "J13") {
                    key = "ArrowDown";
                }else if (keybind === keybindings[6] || keybind === "J01") {
                    key = "Enter";
                }
                if (key !== "") {
                    m_menu.key_handle(key);
                }
            }else {
                m_menu.key_handle(keybind);
            }
        }
    }
    m_menu.draw_self();
};

let gui_loop = undefined;
function seize_control() {
    gui_has_control = true;
    setup_need_directory();
    gui_loop = setInterval(maintain_control, 30);
};

relinquish_control = function() {
    gui_has_control = false;
    clearInterval(gui_loop);
};

seize_control();

console.log("Detonation up and ready!");