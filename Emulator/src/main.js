document.getElementById("app").innerHTML = `
<h1>Detonation Emulation</h1>
`;
let app = document.getElementById("app");
let title = document.getElementById("top");
let engage = document.getElementById("engage");
let prepare = document.getElementById("prepare");
let begin = document.getElementById("begin");
let step = document.getElementById("step");
let Gamerom = document.getElementById("gamerom");
let short_val = document.getElementById("val");
let short_run = document.getElementById("shortrun");
let savestate = document.getElementById("savestate");
let loadstate = document.getElementById("loadstate");
let statetoload = document.getElementById("statetoload");
//let Gameram = document.getElementById("gameram");
//let load = document.getElementById("load");

let state = undefined;
let unpack = undefined;
let go = 0;
let rom = undefined;
let m_ram = undefined;
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

/*let hextoascii = function (str1) {
    let hex = str1.toString();
    let str = "";
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
};*/

Gamerom.addEventListener("change", function () {
    rom = this.files[0];
});
/*Gameram.addEventListener("change", function () {
    m_ram = this.files[0];
});*/
statetoload.addEventListener("change", function () {
    state = this.files[0];
});

engage.onclick = function () {
    if (rom === undefined) {
        alert("No file Selected");
    } else {
        const reader = new FileReader();
        reader.onload = function () {
            rom = new Uint8Array(this.result);
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
            title.innerHTML = "DE: " + romname;
            app.innerHTML = " <h1>" + romname + "</h1>";
        };
        rom = reader.readAsArrayBuffer(rom);
        engage.outerHTML = "<button id='engage' disabled>ROM Loaded</button>";
        Gamerom.outerHTML = "<input type='file' id='gamerom' disabled />";
        go = /*0.5*/ 1;
    }
};

/*let repeat = false;

load.onclick = function () {
    if (m_ram === undefined) {
        if (repeat) {
            load.outerHTML = "<button id='load' disabled>RAM Loaded</button>";
            Gameram.outerHTML = "<input type='file' id='gameram' disabled />";
            go = 1;
        } else {
            alert("About to load game without loaded RAM data. Are you sure?");
        }
        repeat = true;
    } else {
        const reader = new FileReader();
        reader.onload = function () {
            m_ram = new Uint8Array(this.result);
            XA000 = m_ram;
            rambanks[0] = m_ram;
        };
        m_ram = reader.readAsArrayBuffer(m_ram);
        load.outerHTML = "<button id='load' disabled>RAM Loaded</button>";
        Gameram.outerHTML = "<input type='file' id='gameram' disabled />";
        go = 1;
    }
};*/

prepare.onclick = function () {
    if (go === 1) {
        prepare_cpu(rom);
        prepare.outerHTML = "<button id='prepare' disabled>Emulator Ready</button>";
        go = 2;
    } else {
        alert("Load ROM first");
    }
};

(function () {
    let _old_alert = window.alert;
    window.alert = function () {
        //console.log("1");
        if (go === 3) {
            console.log("2");
            if (stop_on_err) {
                go = 2;
                console.log("3");
                begin.innerHTML = "Detonate!";
                console.log("4");
                clearInterval(loop);
                console.log("5");
                stoprightnow = stop_on_err;
            }
            console.log("6");
            _old_alert.apply(window, arguments);
            console.log("7");
        } else {
            _old_alert.apply(window, arguments);
        }
        return;
    };
})();

begin.onclick = function () {
    if (go === 2) {
        go = 3;
        begin.innerHTML = "Pause";
        beginLoop();
    } else if (go === 3) {
        go = 2;
        begin.innerHTML = "Detonate!";
        endLoop();
    }
};

step.onclick = function () {
    go = 2;
    begin.innerHTML = "Detonate!";
    cpu_cycle(true);
};

short_run.onclick = function () {
    go = 2;
    begin.innerHTML = "Detonate!";
    timing_handler(short_val.valueAsNumber);
};

savestate.addEventListener("click", async () => {
    let z = 0;
    if (ram.Flag.Z) {
        z = 1;
    }
    let n = 0;
    if (ram.Flag.N) {
        n = 1;
    }
    let h = 0;
    if (ram.Flag.H) {
        h = 1;
    }
    let c = 0;
    if (ram.Flag.C) {
        c = 1;
    }
    let quirky = new Uint8Array(14);
    let poslow = pos & 0b0000_0000_1111_1111;
    let poshigh = (pos & 0b1111_1111_0000_0000) >> 8;
    /*alert(pos.toString(16));
    alert(poslow.toString(16));
    alert(poshigh.toString(16));
    alert((poslow + poshigh * 0b1_0000_0000).toString(16));*/
    quirky[0] = z * 0b1000_0000 + n * 0b0100_0000 + h * 0b0010_0000 + c * 0b0001_0000;
    quirky[1] = ram.A;
    quirky[2] = ram.B;
    quirky[3] = ram.C;
    quirky[4] = ram.D;
    quirky[5] = ram.E;
    quirky[6] = ram.H;
    quirky[7] = ram.L;
    quirky[8] = ram.SP[0];
    quirky[9] = ram.SP[1];
    quirky[10] = poslow;
    quirky[11] = poshigh;
    quirky[12] = rombank;
    quirky[13] = XFFFF;
    saveState([ quirky, X8000, XA000, XC000, XFE00, XFF00, XFF4C, XFF80 ]);
});

loadstate.onclick = function () {
    if (state !== undefined) {
        const reader = new FileReader();
        reader.onload = function () {
            unpack = new Uint8Array(this.result);
            unpack_state(unpack);
        };
        reader.readAsArrayBuffer(state);
    } else {
        alert("Please select a save state file to load.");
    }
};

let d = document.getElementById("display");
d.outerHTML = "<canvas width='" + (160 * scale).toString() + "' height='" + (144 * scale).toString() + "' id='display'></canvas>";
d = document.getElementById("display");
let ddraw = d.getContext("2d");
ddraw.fillStyle = "#FF0000";
ddraw.fillRect(0, 0, 160 * scale, 144 * scale);

console.log("Detonation up and ready!");
