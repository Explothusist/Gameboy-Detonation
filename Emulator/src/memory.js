const mem_dump_instr = 0;
let mem_abort = false;
let mem_suspicious = false;
 
let boot_rom = new Uint8Array([
    0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E, 
    0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0, 
    0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B, 
    0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9, 
    0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20, 
    0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04, 
    0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2, 
    0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06, 
    0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xE2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20, 
    0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17, 
    0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 
    0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 
    0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 
    0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3C, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x3C, 
    0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20, 
    0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
]);

let run_boot_rom = true;
let in_boot_rom = false;
if (run_boot_rom) {
    in_boot_rom = true;
}

let XFFFF = 0;
let XFF80 = new Uint8Array(0x7f);
let XFF4C = new Uint8Array(0x34);
let XFF00 = new Uint8Array(0x4c);
//let XFEA0 = new Uint8Array(0x60);    (Not Usable)
let XFE00 = new Uint8Array(0xa0);
let XE000 = new Uint8Array(0x1e00); //ECHO
let XC000 = new Uint8Array(0x2000);
let XA000 = new Uint8Array(0x2000); //(RAM Bank)
let X8000 = new Uint8Array(0x2000);
let X4000 = new Uint8Array(0x4000); //(ROM Bank)
let X0000 = new Uint8Array(0x4000); //ROM Bank 0

let rombanks = [];
for (let i = 0; i < 128; i++) {
    rombanks.push(new Uint8Array(0x4000));
}
let rombank = 1;
let rambanks = [];
for (let i = 0; i < 16; i++) {
    rambanks.push(new Uint8Array(0x2000));
}
let rambank = 0;
let pram = 0;
let romhigh = 0;
let car_type = 0;
let mem_mode = 0;

let timestamp = new Date();
let rtc_ram_act = 0;
let rtc_act = 0;
let rtc_mode = -1;

let sram = 0;
let batt = 0;
let rumble = 0;
let rumble_on = 0;

let dma = 0;

let testrom = false;
let lastff01 = 0;
let trommess = "";

function memory_reset() {
    XFFFF = 0; // Interrupt Enable register
    XFF80 = new Uint8Array(0x7f); // HRAM
    XFF4C = new Uint8Array(0x34); // More I/O ish
    XFF00 = new Uint8Array(0x4c); // I/O
    XFE00 = new Uint8Array(0xa0); // OAM
    XE000 = new Uint8Array(0x1e00); // ECHO
    XC000 = new Uint8Array(0x2000); // WRAM
    // XA000 = new Uint8Array(0x2000); // Cartridge RAM
    X8000 = new Uint8Array(0x2000); // Video RAM
};

function setup(rom) {
    car_type = rom[0x147];
    let rom_size = rom[0x148];
    let ram_size = rom[0x149];
    let offset = 0;
    //console.log("Cartridge Type: " + car_type.toString(16));
    //console.log("ROM Size: " + rom_size.toString(16));
    //console.log("RAM Size: " + ram_size);
    if (rom[0x143] === 0x80) {
        alert("Color GameBoy Cartridge: Cannot be run.");
        //return;
    }
    switch (rom_size) {
        case 0:
            //2 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                X4000[i] = rom[i + offset];
            }
            offset += 0x4000;
            //console.log("2 bank ROM");
            break;
        case 1:
            //4 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[1][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[2][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[3][i] = rom[i + offset];
            }
            offset += 0x4000;
            X4000 = rombanks[1];
            //console.log("4 bank ROM");
            break;
        case 2:
            //8 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[1][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[2][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[3][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[4][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[5][i] = rom[i + offset];
            }
            offset += 0x4000;
            for (let i = 0; i < 0x4000; i++) {
                rombanks[6][i] = rom[i + offset];
            }
            for (let i = 0; i < 0x4000; i++) {
                rombanks[7][i] = rom[i + offset];
            }
            offset += 0x4000;
            X4000 = rombanks[1];
            //console.log("8 bank ROM");
            break;
        case 3:
            //16 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 16; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("16 bank ROM");
            break;
        case 4:
            //32 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 32; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("32 bank ROM");
            break;
        case 5:
            //64 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 64; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("64 bank ROM");
            break;
        case 6:
            //128 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 128; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("128 bank ROM");
            break;
        case 0x52:
            //72 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 72; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("72 bank ROM");
            break;
        case 0x53:
            //80 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 80; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("80 bank ROM");
            break;
        case 0x54:
            //96 bank
            for (let i = 0; i < 0x4000; i++) {
                X0000[i] = rom[i];
            }
            offset += 0x4000;
            for (let j = 1; j < 96; j++) {
                for (let i = 0; i < 0x4000; i++) {
                    rombanks[j][i] = rom[i + offset];
                }
                offset += 0x4000;
            }
            X4000 = rombanks[1];
            //console.log("96 bank ROM");
            break;
        default:
            alert("ERROR: invalid ROM size");
    }
    switch (ram_size) {
        case 0:
            //None
            //console.log("No RAM");
            break;
        case 1:
            //1 bank
            //console.log("1 bank RAM");
            break;
        case 2:
            //1 bank
            //console.log("1 bank RAM");
            break;
        case 3:
            //4 bank
            //console.log("4 bank RAM");
            break;
        case 4:
            //16 bank
            //console.log("16 bank RAM");
            break;
        default:
            alert("ERROR: invalid RAM size");
    }
    switch (car_type) {
        case 0:
            //ROM Only
            car_type = 0;
            //console.log("ROM Only");
            break;
        case 1:
            //ROM+MBC1
            car_type = 1;
            //console.log("ROM + MBC1");
            break;
        case 2:
            //ROM+MBC1+RAM
            car_type = 1;
            //console.log("ROM + MBC1 + RAM");
            break;
        case 3:
            //ROM+MBC1+RAM+BATT
            car_type = 1;
            batt = 1;
            //console.log("ROM + MBC1 + RAM + BATT");
            break;
        case 5:
            //ROM+MBC2
            car_type = 2;
            //console.log("ROM + MBC2");
            break;
        case 6:
            //ROM+MBC2+BATT
            car_type = 2;
            batt = 1;
            //console.log("ROM + MBC2 + BATT");
            break;
        case 8:
            //ROM+RAM
            car_type = 0;
            //console.log("ROM + RAM");
            break;
        case 9:
            //ROM+RAM+BATT
            car_type = 0;
            batt = 1;
            //console.log("ROM + RAM + BATT");
            break;
        case 0xb:
            //ROM+MMMO1
            car_type = 2;
            //console.log("ROM + MMM01");
            break;
        case 0xc:
            //ROM+MMMO1+SRAM
            car_type = 2;
            sram = 1;
            //console.log("ROM + MMM01 + SRAM");
            break;
        case 0xd:
            //ROM+MMMO1+SRAM+BATT
            car_type = 2;
            sram = 1;
            batt = 1;
            //console.log("ROM + MMM01 + SRAM + BATT");
            break;
        case 0xf:
            //ROM+MBC3+TIMER+BATT
            car_type = 3;
            batt = 1;
            //console.log("ROM + MBC3 + TIMER + BATT");
            break;
        case 0x10:
            //ROM+MBC3+TIMER+RAM+BATT
            car_type = 3;
            batt = 1;
            //console.log("ROM + MBC3 + TIMER + RAM + BATT");
            break;
        case 0x11:
            //ROM+MBC3
            car_type = 3;
            //console.log("ROM + MBC3");
            break;
        case 0x12:
            //ROM+MCB3+RAM
            car_type = 3;
            //console.log("ROM + MBC3 + RAM");
            break;
        case 0x13:
            //ROM+MCB3+RAM+BATT
            car_type = 3;
            batt = 1;
            //console.log("ROM + MBC3 + RAM + BATT");
            break;
        case 0x19:
            //ROM+MCB5
            car_type = 5;
            //console.log("ROM + MBC5");
            break;
        case 0x1a:
            //ROM+MCB5+RAM
            car_type = 5;
            //console.log("ROM + MBC5 + RAM");
            break;
        case 0x1b:
            //ROM+MCB5+RAM+BATT
            //console.log("ROM + MBC5 + RAM + BATT");
            car_type = 5;
            break;
        case 0x1c:
            //ROM+MCB5+RUMBLE
            car_type = 5;
            rumble = 1;
            //console.log("ROM + MBC5 + RUMBLE");
            break;
        case 0x1d:
            //ROM+MCB5+RUMBLE+SRAM
            car_type = 5;
            rumble = 1;
            sram = 1;
            //console.log("ROM + MBC5 + RUMBLE + SRAM");
            break;
        case 0x1e:
            //ROM+MCB5+RUMBLE+SRAM+BATT
            car_type = 5;
            rumble = 1;
            sram = 1;
            batt = 1;
            //console.log("ROM + MBC5 + RUMBLE + SRAM + BATT");
            break;
        case 0x1f:
            //Pocket Camera
            alert("Cartridge: Pocket Camera");
            break;
        case 0xfd:
            //Bandai TAMA5
            alert("Cartridge: Bandai TAMA5");
            break;
        case 0xfe:
            //Hudson Hu-C3
            alert("Cartridge: Hudson Hu-C3");
            break;
        case 0xff:
            //Hudson Hu-C3
            alert("Cartridge: Hudson Hu-C1");
            break;
        default:
            alert("ERROR: invalid RAM size");
    }

    if (car_type === 5) {
        rombanks[0] = X0000;
    }
}


let sound_registers = [
    0x80, 0x3f, 0x00, 0xff, 0xbf,
    0xff, 0x3f, 0x00, 0xff, 0xbf,
    0x7f, 0xff, 0x9f, 0xff, 0xbf,
    0xff, 0xff, 0x00, 0x00, 0xbf,
    0x00, 0x00, 0x70
];
function read(pos, message = 1) {
    let dump = mem_dump_instr * message;
    if (pos < 0x4000) {
        // Boot ROM
        if (pos < 0x100 && in_boot_rom && run_boot_rom) {
            return boot_rom[pos];
        }
        //ROM bank 0
        if (dump === 1) {
            //console.log("ROM bank 0 read");
        }
        return X0000[pos];
    } else if (pos < 0x8000) {
        //switchable ROM bank
        if (dump === 1) {
            //console.log("Switchable ROM bank " + rombank + " read");
        }
        return X4000[pos - 0x4000];
    } else if (pos < 0xa000) {
        //Video RAM
        if (dump === 1) {
            //console.log("Video RAM read");
        }
        return X8000[pos - 0x8000];
    } else if (pos < 0xc000) {
        //Switchable RAM bank
        if (car_type === 2) {
            if (dump === 1) {
                //console.log("Switchable RAM bank " + rambank + " read");
            }
            return XA000[pos - 0xa000] & 0b1111;
        } else if (car_type !== 3) {
            if (dump === 1) {
                //console.log("Switchable RAM bank " + rambank + " read");
            }
            return XA000[pos - 0xa000];
        } else {
            if (rtc_mode === -1) {
                if (dump === 1) {
                    //console.log("Switchable RAM bank " + rambank + " read");
                }
                return XA000[pos - 0xa000];
            } else {
                timestamp = new Date();
                let ret = 0;
                switch (rtc_mode) {
                    case 8:
                        ret = timestamp.getSeconds();
                        break;
                    case 9:
                        ret = timestamp.getMinutes();
                        break;
                    case 0xa:
                        ret = timestamp.getHours();
                        break;
                    case 0xb:
                        ret = timestamp.getDate();
                        break;
                    case 0xc:
                        ret = rtc_act << 6;
                        break;
                    default:
                        alert("This RCT stuff is not working. Oops, RTC.");
                }
                //console.log("RTC register 0x" + rtc_mode.toString(16) + " read");
                return ret;
            }
        }
    } else if (pos < 0xe000) {
        //Internal RAM
        if (dump === 1) {
            //console.log("Internal RAM read");
        }
        return XC000[pos - 0xc000];
    } else if (pos < 0xfe00) {
        //Echo RAM
        if (dump === 1) {
            //console.log(" !! ALERT !! Echo RAM read");
        }
        return XE000[pos - 0xe000];
    } else if (pos < 0xfea0) {
        //Sprite Attribute Memory (OAB)
        if (dump === 1) {
            //console.log("Sprite Attribute memory read");
        }
        return XFE00[pos - 0xfe00];
    } else if (pos < 0xff00) {
        //Empty (+ Unusable?)
        if (dump === 1) {
            //console.log(" !! ALERT !! Probably unusable memory read: " + pos.toString(16));
        }
        alert(" !! ALERT !! Unusable memory read: " + pos.toString(16));
        mem_abort = true;
        //return XFEA0[pos-0xFEA0];
    } else if (pos < 0xff4c) {
        //I/O Ports
        if (dump === 1) {
            //console.log("I/O Ports read");
        }
        if (pos >= 0xff10 && pos <= 0xff26) {
            return (XFF00[pos - 0xff00] | sound_registers[pos - 0xff10]);
        }
        return XFF00[pos - 0xff00];
    } else if (pos < 0xff80) {
        //Empty (+ I/O ports?)
        if (dump === 1) {
            //console.log(" ?? CAUTION ?? Probably I/O ports extension read");
        }
        return XFF4C[pos - 0xff4c];
    } else if (pos < 0xffff) {
        //Internal HRAM
        if (dump === 1) {
            //console.log("Internal HRAM read");
        }
        return XFF80[pos - 0xff80];
    } else {
        //Interrupt Enable Register
        if (dump === 1) {
            //console.log("Interrupt Enable Register read");
        }
        return XFFFF;
    }
}

function dma_trans(pos) {
    let addr = pos * 0x100;
    for (let i = 0; i < 0x9f; i++) {
        XFE00[i] = read(addr + i);
    }
    dma = 1;
    //console.log("DMA Transfer Complete");
}
function write(pos, val, message = 1) {
    let dump = mem_dump_instr * message;
    if (pos < 0x8000) {
        switch (car_type) {
            case 1:
                if (pos < 0x2000) {
                    if ((val & 0b0000_1111) === 0b1010) {
                        //console.log("RAM bank activated");
                        //alert("mem_suspicious RAM Bank activation");
                        //mem_suspicious = true;
                    } else {
                        //console.log("RAM bank deactivated");
                        //alert("Huh?");
                        //mem_abort = true;
                    }
                    return;
                } else if (pos < 0x4000) {
                    rombank = val & 0b0001_1111;
                    if (rombank === 0) {
                        rombank = 1;
                    }
                    let bank = rombank + (romhigh << 5);
                    X4000 = rombanks[bank];
                    ////console.log("ROM bank changed to bank " + bank);
                    if (bank !== val) {
                        alert(val.toString(2) +" written, changed to " + bank.toString(2) +    "\nfirst: " + rombank.toString(2) + " high: " + romhigh.toString(2));
                        //mem_abort = true;
                    }
                    return;
                } else if (pos < 0x6000) {
                    if (mem_mode === 0) {
                        romhigh = val & 0b0000_0011;
                        let bank = rombank + (romhigh << 5);
                        X4000 = rombanks[bank];
                        //console.log("ROM bank changed to bank " + bank);
                        alert("ROM bank high changed!");
                        //mem_abort = true;
                        return;
                    } else if (mem_mode === 1) {
                        rambank = val & 0b0000_0011;
                        rambanks[pram] = XA000;
                        XA000 = rambanks[rambank];
                        pram = rambank;
                        //console.log("RAM bank changed to bank " + rambank);
                        return;
                    }
                } else if (pos < 0x8000) {
                    mem_mode = val & 0b0000_0001;
                    if (mem_mode === 0) {
                        romhigh = rambank;
                        rambanks[pram] = XA000;
                        XA000 = rambanks[0];
                        pram = 0;
                        let bank = rombank + (romhigh << 5);
                        if (bank === 0) {
                            bank = 1;
                        }
                        X4000 = rombanks[bank];
                    } else if (mem_mode === 1) {
                        rambank = romhigh;
                        rambanks[0] = XA000;
                        XA000 = rambanks[rambank];
                        pram = rambank;
                        romhigh = 0;
                        let bank = rombank + (romhigh << 5);
                        if (bank === 0) {
                            bank = 1;
                        }
                        X4000 = rombanks[bank];
                    }
                    if (dump === 1) {
                        //console.log("Memory mode changed");
                    }
                    return;
                }
                break;
            case 2:
                if (pos < 0x2000) {
                    if (dump === 1) {
                        if ((pos & 0b1_0000_0000) >> 8 !== 0) {
                            //console.log("Invalid address to change RAM bank");
                        }
                        if ((val & 0b0000_1111) === 0b1010) {
                            //console.log("RAM bank activated");
                        } else {
                            //console.log("RAM bank deactivated");
                        }
                    }
                    return;
                } else if (pos < 0x4000) {
                    if ((pos & 0b1_0000_0000) >> 8 !== 1) {
                        //console.log("Invalid address to change ROM bank");
                    }
                    rombank = val & 0b0000_1111;
                    if (rombank === 0) {
                        rombank = 1;
                    }
                    X4000 = rombanks[rombank];
                    //console.log("ROM bank changed to bank " + rombank);
                    return;
                }
                break;
            case 3:
                if (pos < 0x2000) {
                    if ((val & 0b0000_1111) === 0b1010) {
                        //console.log("RAM/RTC bank activated");
                        rtc_ram_act = 1;
                    } else {
                        //console.log("RAM/RTC bank deactivated");
                        rtc_ram_act = 0;
                    }
                    return;
                } else if (pos < 0x4000) {
                    rombank = val & 0b0111_1111;
                    if (rombank === 0) {
                        rombank = 1;
                    }
                    X4000 = rombanks[rombank];
                    //console.log("ROM bank changed to bank " + rombank);
                    return;
                } else if (pos < 0x6000) {
                    if ((val & 0b1111) <= 7) {
                        rambank = val & 0b0000_0111;
                        XA000 = rambanks[rambank];
                        rtc_mode = -1;
                        //console.log("RAM bank changed to bank " + rambank);
                    } else if ((val & 0b1111) <= 0xc) {
                        rtc_mode = val & 0b1111;
                        //console.log("RTC set to 0x" + rtc_mode.toString(16));
                    }
                    return;
                } else if (pos < 0x8000) {
                    mem_mode = val & 0b0000_0001;
                    if (dump === 1) {
                        //Clock latch, redo when ram rebuilt
                        //console.log("RTC latched");
                    }
                    return;
                }
                break;
            case 4:
                alert("MMMO1 cartridge type; cannot handle");
                break;
            case 5:
                if (pos < 0x2000) {
                    if ((val & 0b0000_1111) === 0b1010) {
                        //console.log("RAM bank activated");
                    } else {
                        //console.log("RAM bank deactivated");
                    }
                    return;
                } else if (pos < 0x3000) {
                    rombank = val;
                    let bank = rombank + (romhigh << 8);
                    X4000 = rombanks[bank];
                    //console.log("ROM bank changed to bank " + bank);
                    return;
                } else if (pos < 0x4000) {
                    romhigh = val & 1;
                    let bank = rombank + (romhigh << 8);
                    X4000 = rombanks[bank];
                    //console.log("ROM bank changed to bank " + bank);
                    return;
                } else if (pos < 0x6000) {
                    if (rumble === 0) {
                        rambank = val & 0b0000_1111;
                    } else {
                        rambank = val & 0b0000_0111;
                        rumble_on = val & 0b0000_1000;
                    }
                    XA000 = rambanks[rambank];
                    //console.log("RAM bank changed to bank " + rambank);
                    return;
                }
                break;
            default:
                alert("Massive ERROR!?!?!?!?! car_type = " + car_type);
        }
    } else {
        if (pos >= 0x8000 && pos < 0xa000) {
            //Video RAM
            if (mem_dump_instr === 1) {
                //console.log("Video RAM written");
            }
            X8000[pos - 0x8000] = val;
            return;
        } else if (pos < 0xc000) {
            //Switchable RAM bank
            if (car_type === 2) {
                XA000[pos - 0xa000] = val & 0b1111;
                if (dump === 1) {
                    //console.log("Switchable RAM bank " + rambank + " written");
                }
            } else if (car_type !== 3) {
                XA000[pos - 0xa000] = val;
                if (dump === 1) {
                    //console.log("Switchable RAM bank " + rambank + " written");
                }
            } else {
                if (rtc_mode === -1) {
                    XA000[pos - 0xa000] = val;
                    if (dump === 1) {
                        //console.log("Switchable RAM bank " + rambank + " written");
                    }
                } else {
                    if (rtc_mode === 0xc) {
                        rtc_act = (val & 0b0100_0000) >> 6;
                    }
                    if (dump === 1) {
                        //console.log("RTC register 0x" + rtc_mode + " written");
                    }
                }
            }
            return;
        } else if (pos < 0xe000) {
            //Internal RAM
            if (dump === 1) {
                //console.log("Internal RAM written");
            }
            XC000[pos - 0xc000] = val;
            XE000[pos - 0xe000] = val;
            return;
        } else if (pos < 0xfe00) {
            //Echo RAM
            if (dump === 1) {
                //console.log(" !! ALERT !! Echo RAM written: " + pos.toString(16));
            }
            XC000[pos - 0xc000] = val;
            XE000[pos - 0xe000] = val;
            return;
        } else if (pos < 0xfea0) {
            //Sprite Attribute Memory (OAB)
            if (dump === 1) {
                //console.log(" ?? CAUTION ?? Sprite Attribute memory written");
            }
            XFE00[pos - 0xfe00] = val;
            return;
        } else if (pos < 0xff00) {
            //Empty (+ Unusable?)
            if (dump === 1) {
                //console.log(" !! ALERT !! Probably unusable memory written: " + pos.toString(16));
            }
            //alert(" !! ALERT !! Unusable memory written: " + pos.toString(16));
            //mem_abort = true;
            //XFEA0[pos-0xFEA0] = val;
            return;
        } else if (pos < 0xff4c) {
            //I/O Ports+Special Registers
            if (dump === 1) {
                //console.log("I/O Ports/Special Registers written");
            }
            if (pos === 0xff01) {
                if (testrom) {
                    lastff01 = val;
                    trommess += String.fromCharCode(lastff01).toString();
                    alert("One... \n" + trommess);
                    //console.log(String.fromCharCode(lastff01));
                }
            } else if (pos === 0xff01) {
                if (testrom) {
                    if (val === 0x82) {
                        //console.log(String.fromCharCode(lastff01));
                        alert("Two!");
                    }
                }
            } else if (pos === 0xff04) {
                //Div Timer
                XFF00[4] = 0;
            }else if (pos === 0xff11) {
                //NR11 Length Counter
                val &= 0b1100_0000;
                val |= 0b0011_1111;
                XFF00[0x11] = val;
            } else if (pos === 0xff16) {
                //NR21 Length Counter
                val &= 0b1100_0000;
                val |= 0b0011_1111;
                XFF00[0x16] = val;
            } else if (pos === 0xff1b) {
                //NR31 Length Counter
                XFF00[0x1b] = 0b1111_1111;
            } else if (pos === 0xff20) {
                //NR21 Length Counter
                val &= 0b1100_0000;
                val |= 0b0011_1111;
                XFF00[0x20] = val;
            } else if (pos === 0xff46) {
                //DMA Transfer
                XFF00[0x46] = val;
                dma_trans(val);
            } else {
                XFF00[pos - 0xff00] = val;
            }
            return;
        } else if (pos < 0xff80) {
            // Used once (Boot ROM)
            if (pos === 0xff50 && in_boot_rom && run_boot_rom) {
                in_boot_rom = false;
            }
            //Empty (+ I/O ports?)
            if (dump === 1) {
                //console.log(" ?? CAUTION ?? Probably I/O ports extension written");
            }
            XFF4C[pos - 0xff4c] = val;
            return XFF4C[pos - 0xff4c];
        } else if (pos < 0xffff) {
            //Internal HRAM
            if (dump === 1) {
                //console.log("Internal HRAM written");
            }
            XFF80[pos - 0xff80] = val;
            return;
        } else {
            //Interrupt Enable Register
            if (dump === 1) {
                //console.log("Interrupt Enable Register written");
            }
            XFFFF = val;
            return;
        }
    }
}

let z = 0;
function read_unpack(unpack) {
    let ret = unpack[z];
    z++;
    return ret;
}

function load_state(unpack, modz) {
    z = modz;
    rombank = read_unpack(unpack);
    X4000 = rombanks[rombank];
    XFFFF = read_unpack(unpack);
    for (var i = 0; i < 0x2000; i++) {
        X8000[i] = read_unpack(unpack);
    }
    for (var i = 0; i < 0x2000; i++) {
        XA000[i] = read_unpack(unpack);
    }
    for (var i = 0; i < 0x2000; i++) {
        XC000[i] = read_unpack(unpack);
    }
    for (var i = 0; i < 0xa0; i++) {
        XFE00[i] = read_unpack(unpack);
    }
    for (var i = 0; i < 0x4c; i++) {
        XFF00[i] = read_unpack(unpack);
    }
    for (var i = 0; i < 0x34; i++) {
        XFF4C[i] = read_unpack(unpack);
    }
    for (var i = 0; i < 0x7f; i++) {
        XFF80[i] = read_unpack(unpack);
    }
}
