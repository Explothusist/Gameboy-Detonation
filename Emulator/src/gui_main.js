document.getElementById("app").innerHTML = `
<h1>Detonation Emulation</h1>
`;
let m_canv = document.getElementById("display");
m_canv.outerHTML = "<canvas width='" + (160 * scale).toString() + "' height='" + (144 * scale).toString() + "' id='display'></canvas>";
m_canv = document.getElementById("display");
let m_ctx = m_canv.getContext("2d");
m_ctx.fillStyle = "#FF0000";
m_ctx.fillRect(0, 0, 160 * scale, 144 * scale);

class Menu {

    constructor(title, entries, entry_effects) {
        this.title = title;
        this.entries = entries;
        this.entry_effects = entry_effects;

        this.selected = 0;
    }
    draw_self() {
        m_ctx.fillStyle = "rgb(200, 200, 200)";
        m_ctx.fillRect(0, 0, 160*scale, 144*scale);

        m_ctx.fillStyle = "rgb(0, 0, 0)";
        m_ctx.font = (6*scale)+"px Courier New";
        let text = this.title.split("\n");
        for (let i = 0; i < text.length; i++) {
            m_ctx.fillText(text[i], 16*scale, (24+(i*8))*scale);
        }

        for (let i = 0; i < this.entries.length; i++) {
            if (i === this.selected) {
                m_ctx.fillStyle = "rgb(150, 150, 150)";
                m_ctx.fillRect(32*scale, (48+(i*16))*scale, 96*scale, 10*scale);
            }
            m_ctx.fillStyle = "rgb(0, 0, 0)";
            m_ctx.fillText(this.entries[i], 34*scale, (55+(i*16))*scale);
        }
    }
    key_handle(key) {
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
            this.entry_effects[this.selected]();
        }
    }
};

let m_menu = new Menu();



// Prepare functions (for cross-reference)
// Screens
function setup_need_directory() {};
function setup_main_menu() {};
function setup_load_game() {};
// Actions
// function open_directory() {};



let data_dir_source = document.getElementById("data_dir");

let data_dir_files = [];

// data_dir_source.addEventListener("change", function () {
//     data_dir_files = this.files;
//     setup_main_menu();
// });
data_dir_source.addEventListener(
    "change",
    (event) => {
        for (const file of event.target.files) {
            data_dir_files.push(file);
        }
        setup_main_menu();
    },
    false,
);

function get_file(filename) {
    for (let file of data_dir_files) {
        if (file.name === filename) {
            return file;
        }
    }
};



setup_need_directory = function() {
    m_menu = new Menu("Welcome! Please select the emulator\n    data directory.", [/*"Select Directory"*/], [/*open_directory*/]);
};
setup_main_menu = function() {
    m_menu = new Menu("Welcome! Select an action.", ["Load Game", "Register New ROM", "Edit Existing Game", "Keybindings"], [setup_load_game]);
};
setup_load_game = function() {
    let game_names = [];
    let game_actions = [];
    let registered_games = get_file("registered_games.txt");
    game_names.push("Back");
    game_actions.push(setup_main_menu);
    m_menu = new Menu("Select a game to load.", game_names, game_actions);
};

// open_directory = function() {

// };

document.addEventListener("keyup", function (event) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter") {
        event.preventDefault();
        m_menu.key_handle(event.key);
    }
});

function maintain_control() {
    m_menu.draw_self();
};

let gui_loop = undefined;
function seize_control() {
    setup_need_directory();
    gui_loop = setInterval(maintain_control, 50);
};

function relinquish_control() {
    clearInterval(gui_loop);
};

seize_control();