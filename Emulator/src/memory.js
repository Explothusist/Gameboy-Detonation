const mem_dump_instr = 0;
let mem_abort = false;
let mem_suspicious = false;

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

function setup(rom) {
    car_type = rom[0x147];
    let rom_size = rom[0x148];
    let ram_size = rom[0x149];
    let offset = 0;
    console.log("Cartridge Type: " + car_type.toString(16));
    console.log("ROM Size: " + rom_size.toString(16));
    console.log("RAM Size: " + ram_size);
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
            break;
        default:
            alert("ERROR: invalid ROM size");
    }
    /*switch (ram_size) {
        case 0:
            //None
            break;
        case 1:
            //1 bank
            break;
        case 2:
            //1 bank
            break;
        case 3:
            //4 bank
            break;
        case 4:
            //16 bank
            break;
        default:
            alert("ERROR: invalid RAM size");
    }*/
    switch (car_type) {
        case 0:
            //ROM Only
            car_type = 0;
            break;
        case 1:
            //ROM+MBC1
            car_type = 1;
            break;
        case 2:
            //ROM+MBC1+RAM
            car_type = 1;
            break;
        case 3:
            //ROM+MBC1+RAM+BATT
            car_type = 1;
            batt = 1;
            break;
        case 5:
            //ROM+MBC2
            car_type = 2;
            break;
        case 6:
            //ROM+MBC2+BATT
            car_type = 2;
            batt = 1;
            break;
        case 8:
            //ROM+RAM
            car_type = 0;
            break;
        case 9:
            //ROM+RAM+BATT
            car_type = 0;
            batt = 1;
            break;
        case 0xb:
            //ROM+MMMO1
            car_type = 2;
            break;
        case 0xc:
            //ROM+MMMO1+SRAM
            car_type = 2;
            sram = 1;
            break;
        case 0xd:
            //ROM+MMMO1+SRAM+BATT
            car_type = 2;
            sram = 1;
            batt = 1;
            break;
        case 0xf:
            //ROM+MCB3+TIMER+BATT
            car_type = 3;
            batt = 1;
            break;
        case 0x10:
            //ROM+MCB3+TIMER+RAM+BATT
            car_type = 3;
            batt = 1;
            break;
        case 0x11:
            //ROM+MCB3
            car_type = 3;
            break;
        case 0x12:
            //ROM+MCB3+RAM
            car_type = 3;
            break;
        case 0x13:
            //ROM+MCB3+RAM+BATT
            car_type = 3;
            batt = 1;
            break;
        case 0x19:
            //ROM+MCB5
            car_type = 5;
            break;
        case 0x1a:
            //ROM+MCB5+RAM
            car_type = 5;
            break;
        case 0x1b:
            //ROM+MCB5+RAM+BATT
            car_type = 5;
            break;
        case 0x1c:
            //ROM+MCB5+RUMBLE
            car_type = 5;
            rumble = 1;
            break;
        case 0x1d:
            //ROM+MCB5+RUMBLE+SRAM
            car_type = 5;
            rumble = 1;
            sram = 1;
            break;
        case 0x1e:
            //ROM+MCB5+RUMBLE+SRAM+BATT
            car_type = 5;
            rumble = 1;
            sram = 1;
            batt = 1;
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

function read(pos, message = 1) {
    let dump = mem_dump_instr * message;
    if (pos < 0x4000) {
        //ROM bank 0
        if (dump === 1) {
            console.log("ROM bank 0 read");
        }
        return X0000[pos];
    } else if (pos < 0x8000) {
        //switchable ROM bank
        if (dump === 1) {
            console.log("Switchable ROM bank " + rombank + " read");
        }
        return X4000[pos - 0x4000];
    } else if (pos < 0xa000) {
        //Video RAM
        if (dump === 1) {
            console.log("Video RAM read");
        }
        return X8000[pos - 0x8000];
    } else if (pos < 0xc000) {
        //Switchable RAM bank
        if (car_type === 2) {
            if (dump === 1) {
                console.log("Switchable RAM bank " + rambank + " read");
            }
            return XA000[pos - 0xa000] & 0b1111;
        } else if (car_type !== 3) {
            if (dump === 1) {
                console.log("Switchable RAM bank " + rambank + " read");
            }
            return XA000[pos - 0xa000];
        } else {
            if (rtc_mode === -1) {
                if (dump === 1) {
                    console.log("Switchable RAM bank " + rambank + " read");
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
                console.log("RTC register 0x" + rtc_mode.toString(16) + " read");
                return ret;
            }
        }
    } else if (pos < 0xe000) {
        //Internal RAM
        if (dump === 1) {
            console.log("Internal RAM read");
        }
        return XC000[pos - 0xc000];
    } else if (pos < 0xfe00) {
        //Echo RAM
        if (dump === 1) {
            console.log(" !! ALERT !! Echo RAM read");
        }
        return XE000[pos - 0xe000];
    } else if (pos < 0xfea0) {
        //Sprite Attribute Memory (OAB)
        if (dump === 1) {
            console.log("Sprite Attribute memory read");
        }
        return XFE00[pos - 0xfe00];
    } else if (pos < 0xff00) {
        //Empty (+ Unusable?)
        if (dump === 1) {
            console.log(
                " !! ALERT !! Probably unusable memory read: " + pos.toString(16)
            );
        }
        alert(" !! ALERT !! Unusable memory read: " + pos.toString(16));
        mem_abort = true;
        //return XFEA0[pos-0xFEA0];
    } else if (pos < 0xff4c) {
        //I/O Ports
        if (dump === 1) {
            console.log("I/O Ports read");
        }
        return XFF00[pos - 0xff00];
    } else if (pos < 0xff80) {
        //Empty (+ I/O ports?)
        if (dump === 1) {
            console.log(" ?? CAUTION ?? Probably I/O ports extension read");
        }
        return XFF4C[pos - 0xff4c];
    } else if (pos < 0xffff) {
        //Internal HRAM
        if (dump === 1) {
            console.log("Internal HRAM read");
        }
        return XFF80[pos - 0xff80];
    } else {
        //Interrupt Enable Register
        if (dump === 1) {
            console.log("Interrupt Enable Register read");
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
    console.log("DMA Transfer Complete");
}

function write(pos, val, message = 1) {
    let dump = mem_dump_instr * message;
    if (pos < 0x8000) {
        switch (car_type) {
            case 1:
                if (pos < 0x2000) {
                    if ((val & 0b0000_1111) === 0b1010) {
                        console.log("RAM bank activated");
                        //alert("mem_suspicious RAM Bank activation");
                        //mem_suspicious = true;
                    } else {
                        console.log("RAM bank deactivated");
                        /*alert("Huh?");
                        mem_abort = true;*/
                    }
                    return;
                } else if (pos < 0x4000) {
                    rombank = val & 0b0001_1111;
                    if (rombank === 0) {
                        rombank = 1;
                    }
                    let bank = rombank + (romhigh << 5);
                    X4000 = rombanks[bank];
                    //console.log("ROM bank changed to bank " + bank);
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
                        console.log("ROM bank changed to bank " + bank);
                        alert("ROM bank high changed!");
                        //mem_abort = true;
                        return;
                    } else if (mem_mode === 1) {
                        rambank = val & 0b0000_0011;
                        rambanks[pram] = XA000;
                        XA000 = rambanks[rambank];
                        pram = rambank;
                        console.log("RAM bank changed to bank " + rambank);
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
                        console.log("Memory mode changed");
                    }
                    return;
                }
                break;
            case 2:
                if (pos < 0x2000) {
                    if (dump === 1) {
                        if ((pos & 0b1_0000_0000) >> 8 !== 0) {
                            console.log("Invalid address to change RAM bank");
                        }
                        if ((val & 0b0000_1111) === 0b1010) {
                            console.log("RAM bank activated");
                        } else {
                            console.log("RAM bank deactivated");
                        }
                    }
                    return;
                } else if (pos < 0x4000) {
                    if ((pos & 0b1_0000_0000) >> 8 !== 1) {
                        console.log("Invalid address to change ROM bank");
                    }
                    rombank = val & 0b0000_1111;
                    if (rombank === 0) {
                        rombank = 1;
                    }
                    X4000 = rombanks[rombank];
                    console.log("ROM bank changed to bank " + rombank);
                    return;
                }
                break;
            case 3:
                if (pos < 0x2000) {
                    if ((val & 0b0000_1111) === 0b1010) {
                        console.log("RAM/RTC bank activated");
                        rtc_ram_act = 1;
                    } else {
                        console.log("RAM/RTC bank deactivated");
                        rtc_ram_act = 0;
                    }
                    return;
                } else if (pos < 0x4000) {
                    rombank = val & 0b0111_1111;
                    if (rombank === 0) {
                        rombank = 1;
                    }
                    X4000 = rombanks[rombank];
                    console.log("ROM bank changed to bank " + rombank);
                    return;
                } else if (pos < 0x6000) {
                    if ((val & 0b1111) <= 7) {
                        rambank = val & 0b0000_0111;
                        XA000 = rambanks[rambank];
                        rtc_mode = -1;
                        console.log("RAM bank changed to bank " + rambank);
                    } else if ((val & 0b1111) <= 0xc) {
                        rtc_mode = val & 0b1111;
                        console.log("RTC set to 0x" + rtc_mode.toString(16));
                    }
                    return;
                } else if (pos < 0x8000) {
                    mem_mode = val & 0b0000_0001;
                    if (dump === 1) {
                        //Clock latch, redo when ram rebuilt
                        console.log("RTC latched");
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
                        console.log("RAM bank activated");
                    } else {
                        console.log("RAM bank deactivated");
                    }
                    return;
                } else if (pos < 0x3000) {
                    rombank = val;
                    let bank = rombank + (romhigh << 8);
                    X4000 = rombanks[bank];
                    console.log("ROM bank changed to bank " + bank);
                    return;
                } else if (pos < 0x4000) {
                    romhigh = val & 1;
                    let bank = rombank + (romhigh << 8);
                    X4000 = rombanks[bank];
                    console.log("ROM bank changed to bank " + bank);
                    return;
                } else if (pos < 0x6000) {
                    if (rumble === 0) {
                        rambank = val & 0b0000_1111;
                    } else {
                        rambank = val & 0b0000_0111;
                        rumble_on = val & 0b0000_1000;
                    }
                    XA000 = rambanks[rambank];
                    console.log("RAM bank changed to bank " + rambank);
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
                console.log("Video RAM written");
            }
            X8000[pos - 0x8000] = val;
            return;
        } else if (pos < 0xc000) {
            //Switchable RAM bank
            if (car_type === 2) {
                XA000[pos - 0xa000] = val & 0b1111;
                if (dump === 1) {
                    console.log("Switchable RAM bank " + rambank + " written");
                }
            } else if (car_type !== 3) {
                XA000[pos - 0xa000] = val;
                if (dump === 1) {
                    console.log("Switchable RAM bank " + rambank + " written");
                }
            } else {
                if (rtc_mode === -1) {
                    XA000[pos - 0xa000] = val;
                    if (dump === 1) {
                        console.log("Switchable RAM bank " + rambank + " written");
                    }
                } else {
                    if (rtc_mode === 0xc) {
                        rtc_act = (val & 0b0100_0000) >> 6;
                    }
                    if (dump === 1) {
                        console.log("RTC register 0x" + rtc_mode + " written");
                    }
                }
            }
            return;
        } else if (pos < 0xe000) {
            //Internal RAM
            if (dump === 1) {
                console.log("Internal RAM written");
            }
            XC000[pos - 0xc000] = val;
            XE000[pos - 0xe000] = val;
            return;
        } else if (pos < 0xfe00) {
            //Echo RAM
            if (dump === 1) {
                console.log(" !! ALERT !! Echo RAM written: " + pos.toString(16));
            }
            XC000[pos - 0xc000] = val;
            XE000[pos - 0xe000] = val;
            return;
        } else if (pos < 0xfea0) {
            //Sprite Attribute Memory (OAB)
            if (dump === 1) {
                console.log(" ?? CAUTION ?? Sprite Attribute memory written");
            }
            XFE00[pos - 0xfe00] = val;
            return;
        } else if (pos < 0xff00) {
            //Empty (+ Unusable?)
            if (dump === 1) {
                console.log(
                    " !! ALERT !! Probably unusable memory written: " + pos.toString(16)
                );
            }
            //alert(" !! ALERT !! Unusable memory written: " + pos.toString(16));
            //mem_abort = true;
            //XFEA0[pos-0xFEA0] = val;
            return;
        } else if (pos < 0xff4c) {
            //I/O Ports+Special Registers
            if (dump === 1) {
                console.log("I/O Ports/Special Registers written");
            }
            if (pos === 0xff01) {
                if (testrom) {
                    lastff01 = val;
                    trommess += String.fromCharCode(lastff01).toString();
                    alert("One... \n" + trommess);
                    console.log(String.fromCharCode(lastff01));
                }
            } else if (pos === 0xff01) {
                if (testrom) {
                    if (val === 0x82) {
                        console.log(String.fromCharCode(lastff01));
                        alert("Two!");
                    }
                }
            } else if (pos === 0xff04) {
                //Div Timer
                XFF00[4] = 0;
            } else if (pos === 0xff11) {
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
            //Empty (+ I/O ports?)
            if (dump === 1) {
                console.log(" ?? CAUTION ?? Probably I/O ports extension written");
            }
            XFF4C[pos - 0xff4c] = val;
            return XFF4C[pos - 0xff4c];
        } else if (pos < 0xffff) {
            //Internal HRAM
            if (dump === 1) {
                console.log("Internal HRAM written");
            }
            XFF80[pos - 0xff80] = val;
            return;
        } else {
            //Interrupt Enable Register
            if (dump === 1) {
                console.log("Interrupt Enable Register written");
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
