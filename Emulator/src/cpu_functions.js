let singledisp = document.getElementById("singledisp");
let dump = document.getElementById("dump");
let log_pos = document.getElementById("log_pos");
let log_run = document.getElementById("log_run");
let log_run_back = document.getElementById("log_run_back");

let cpu_timestamp = new Date();

let err_log = []; //Error Log, rolling last 50 instructions+effects
const err_log_en = true; //Array is most recent last for efficiency
let log_len = 200;
let stop_on_err = false;
let stoprightnow = false;

if (err_log_en) {
    log_pos.max = log_len;
}

let quit = false;
let cpu_abort = false;
let cpu_suspicious = false;
let cpu_dump_intstr = 0; //misc. debug only let because of checkbox
const dis_unimp_opcode = 0; // 0 = error, 1 = opcode
let old_ram = {A: 0, B: 0, C: 0, D: 0, E: 0, H: 0, L: 0, Flag: { Z: false, N: false, H: false, C: false }, SP: [0, 0]};
//Devise system for saving RAM, poss use title or store name to use
//Redo RTC in MBC3 when setting that up, store old time and add difference to timers
//TESTROM:    CPU: 00,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F
//                    CB: SECDIG,0-3,4-7,8-B,C-F
//                    PPU: SPR
//                    MBC: MBC1,MBC2,MBC3,MBC5
//             Opcodes to test: LD (nn),n, LD n,(nn), INC n, DEC n, (Rotates), JR (con),s, JP (con),nn, ADD nn,nn, ADD(C) n,n, SUB(C) n,n, AND n, XOR n,
//                                                OR n, CP n, RET (con), CALL (con), LDH (n),A, LDH (C),A, ADD SP,s, LD (nn), A
//             Opcodes tested:
//DAA opposes CPU Manual
//Check EA and rombank changing (Pokemon 1F9B)
//rebuild sound; createMeadiaStreamSource
//8B is suspicious
//go after ROM Bank set to zero in ZELDA; not much there
//Check DAA out, called out as wrong
//Look over interrupts, EI, DI
//Something up in stack pointer test
//Investigate all non-CB shifts/rotates
//1: pass, 2: fail, 3: pass, 4: pass, 5: pass, 6: pass
//7: pass 8: pass, 9: pass, 10: pass, 11: pass
//
//Complete: 0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F
//Timing:     0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F
//CB done:    0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F
let break_loop = false;
let interrupts = false;
let interrupts_delayed_true = false;
let stopped = false;
let halt = false; //We can ignore Halt
let pos = 0x100; //PC
if (run_boot_rom) {
    pos = 0x00;
}
let cycles = 0;
let sound_timer = 8183.59375;
let frames = 0;

let keybindings = ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "z", "x", "Enter", "Shift"];

//01-special:
//  Passed

//02-interrupts:
//  EI
//  Failed #2

//03-op sp,hl:
//  Passed

//04-op r, imm:
//  Passed

//05-op rp:
//  Passed

//06-ld r,r:
//  Passed

//07-jr,jp,call,ret,rst:
//  Passed

//08-misc instrs:
//  Passed

//09-op r,r:
//  Passed

//10-bit ops:
//  Passed

//11-op a,(hl):
//  Passed

function combine_2b8(first, second) {
    return second + (first << 8);
};
function split_b16(large) {
    return [
        (large & 0xff00) >> 8,
        large & 0x00ff
    ];
};
class Register_Storage {

    constructor() {
        this.A = 0;
        this.B = 0;
        this.C = 0;
        this.D = 0;
        this.E = 0;
        this.H = 0;
        this.L = 0;
        this.Flag = {
            Z: false,
            N: false,
            H: false,
            C: false
        };
        this.SP = [0, 0];
    }
    getA() {
        return this.A;
    }
    getB() {
        return this.B;
    }
    getC() {
        return this.C;
    }
    getD() {
        return this.D;
    }
    getE() {
        return this.E;
    }
    getH() {
        return this.H;
    }
    getL() {
        return this.L;
    }
    setA(value) {
        this.A = value;
    }
    setB(value) {
        this.B = value;
    }
    setC(value) {
        this.C = value;
    }
    setD(value) {
        this.D = value;
    }
    setE(value) {
        this.E = value;
    }
    setH(value) {
        this.H = value;
    }
    setL(value) {
        this.L = value;
    }
    getBC() {
        return combine_2b8(this.B, this.C);
    }
    getDE() {
        return combine_2b8(this.D, this.E);
    }
    getHL() {
        return combine_2b8(this.H, this.L);
    }
    setBC(value) {
        let ret = split_b16(value);
        this.setB(ret[0]);
        this.setC(ret[1]);
    }
    setDE(value) {
        let ret = split_b16(value);
        this.setD(ret[0]);
        this.setE(ret[1]);
    }
    setHL(value) {
        let ret = split_b16(value);
        this.setH(ret[0]);
        this.setL(ret[1]);
    }
    getSP() {
        return combine_2b8(this.SP[0], this.SP[1]);
    }
    setSP(value) {
        let ret = split_b16(value);
        this.SP[0] = ret[0];
        this.SP[1] = ret[1];
    }
};

let ram = new Register_Storage();

dump.addEventListener("change", function () {
    alert(dump.checked);
    if (dump.checked === true) {
        cpu_dump_intstr = 1;
        cb_dump_intstr = 1;
    } else {
        cpu_dump_intstr = 0;
        cb_dump_intstr = 0;
    }
});

// Universal Functions
function get_byte(no_mem_log=false) {
    let ret = 0;
    if (no_mem_log) {
        ret = read(pos, 0);
    }else {
        ret = read(pos);
    }
    pos++;
    return ret;
};

// Operation Functions
function alub8adder(num, val, fz, fn, fh, fc) {
    if (fh !== 0) {
        let fnum = Math.abs(num) & 0b0000_1111;
        if (num < 0) {
            fnum *= -1;
        }
        let fval = Math.abs(val) & 0b0000_1111;
        if (val < 0) {
            fval *= -1;
        }
        fnum += fval;
        if (fnum > 0b0000_1111 && fh === 1) {
            ram.Flag.H = true;
        } else if (fh === 1) {
            ram.Flag.H = false;
        }
        if (fnum < 0b0000_0000 && fh === -1) {
            ram.Flag.H = true;
        } else if (fh === -1) {
            ram.Flag.H = false;
        }
    }
    num += val;
    if (num > 0b1111_1111 && fc === 1) {
        ram.Flag.C = true;
    } else if (fc === 1) {
        ram.Flag.C = false;
    }
    if (num < 0b0000_0000 && fc === -1) {
        ram.Flag.C = true;
    } else if (fc === -1) {
        ram.Flag.C = false;
    }
    if (num < 0) {
        num += 0b1_0000_0000;
    }
    num = num & 0b1111_1111;
    if (num === 0 && fz === 1) {
        ram.Flag.Z = true;
    } else if (fz === 1) {
        ram.Flag.Z = false;
    }
    return num;
}
function alub16adder(n, v, fz, fn, fh, fc) {
    let num = combine_2b8(n[0], n[1]);
    let val = combine_2b8(v[0], v[1]);
    if (fh !== 0) {
        let fnum = Math.abs(num) & 0b1111_1111_1111;
        if (num < 0) {
            fnum *= -1;
        }
        let fval = Math.abs(val) & 0b1111_1111_1111;
        if (val < 0) {
            fval *= -1;
        }
        fnum += fval;
        if (fnum > 0b0000_1111_1111_1111 && fh === 1) {
            ram.Flag.H = true;
        } else if (fh === 1) {
            ram.Flag.H = false;
        }
        if (fnum < 0b0000_0000_0000_0000 && fh === -1) {
            ram.Flag.H = true;
        } else if (fh === -1) {
            ram.Flag.H = false;
        }
    }
    num += val;
    if (num > 0b1111_1111_1111_1111 && fc === 1) {
        ram.Flag.C = true;
    } else if (fc === 1) {
        ram.Flag.C = false;
    }
    if (num < 0b0000_0000_0000_0000 && fc === -1) {
        ram.Flag.C = true;
    } else if (fc === -1) {
        ram.Flag.C = false;
    }
    if (num < 0) {
        num += 0b1_0000_0000_0000_0000;
    }
    num = num & 0b1111_1111_1111_1111;
    let ret = split_b16(num);
    return ret;
}
function rlc(val, fz, fn, fh, fc) {
    if (fc === 1) {
        if ((val & 0b1000_0000) >> 7 === 1) {
            ram.Flag.C = true;
        } else {
            ram.Flag.C = false;
        }
    }
    let drop = val & 0b1000_0000;
    drop = drop >> 7;
    val = val << 1;
    val += drop;
    val = val & 0b1111_1111;
    if (fz === 1 && val === 0) {
        ram.Flag.Z = true;
    } else if (fz === 1) {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    return val;
}
function rl(val, fz, fn, fh, fc) {
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    if (fc === 1) {
        if ((val & 0b1000_0000) >> 7 === 1) {
            ram.Flag.C = true;
        } else {
            ram.Flag.C = false;
        }
    }
    val = val << 1;
    val += car;
    val = val & 0b1111_1111;
    if (fz === 1 && val === 0) {
        ram.Flag.Z = true;
    } else if (fz === 1) {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    return val;
}
function rrc(val, fz, fn, fh, fc) {
    if (fc === 1) {
        if ((val & 0b0000_0001) === 1) {
            ram.Flag.C = true;
        } else {
            ram.Flag.C = false;
        }
    }
    let drop = val & 0b0000_0001;
    val = val >> 1;
    drop = drop << 7;
    val += drop;
    if (fz === 1 && val === 0) {
        ram.Flag.Z = true;
    } else if (fz === 1) {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    return val;
}
function rr(val, fz, fn, fh, fc) {
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    if (fc === 1) {
        if ((val & 0b0000_0001) === 1) {
            ram.Flag.C = true;
        } else {
            ram.Flag.C = false;
        }
    }
    val = val >> 1;
    val += car << 7;
    if (fz === 1 && val === 0) {
        ram.Flag.Z = true;
    } else if (fz === 1) {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    return val;
}
function DAA() {
    // alert("DAA");
    //cpu_abort = true;
    if (!ram.Flag.N) {
        if (ram.Flag.C || ram.A > 0x99) {
            ram.A += 0x60;
            ram.Flag.C = true;
        }
        if (ram.Flag.H || (ram.A & 0x0f) > 0x09) {
            ram.A += 0x6;
        }
    } else {
        if (ram.Flag.C) {
            ram.A -= 0x60;
            ram.Flag.C = true;
        }
        if (ram.Flag.H) {
            ram.A -= 0x6;
        }
    }
    ram.A = ram.A & 0xff;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    }else {
        ram.Flag.Z = false;
    }
    ram.Flag.H = false;
}
function stackpushb16(val) {
    let extract = ram.getSP();
    extract--;
    write(extract, val[0]);
    extract--;
    write(extract, val[1]);
    ram.setSP(extract);
}
function stackpopb16() {
    let val = [0, 0];
    let extract = ram.getSP();
    val[1] = read(extract);
    extract++;
    val[0] = read(extract);
    extract++;
    ram.setSP(extract);
    return val;
}
function sbcA(to_sub) {
    // Rewrote a subtraction routine to deal with integers and overflow
    // instead of deal with X - (0xff + 1)
    let subbed = 0;
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    subbed = ram.A - (to_sub + car);
    if (subbed < 0) {
        ram.Flag.C = true;
        subbed += 256;
    } else {
        ram.Flag.C = false;
    }
    if (((ram.A & 0b00001111) - (to_sub & 0b00001111) - car) < 0) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    ram.A = subbed;
    ram.Flag.N = true;
    if (ram.A == 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
}

// Opcode Functions

let nop_counter = 0;
function run0x00() {
    //NOP
    //Do Nothing
    nop_counter += 2;
    if (nop_counter >= 20) {
        alert("Suspiciously many NOPs");
        cpu_abort = true;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x00    NOP");
    }
}
function run0x01() {
    //LD BC, nn
    let n1 = get_byte();
    let n2 = get_byte();
    ram.setBC(combine_2b8(n2, n1));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x01    LD BC, nn");
        console.log("BC:" + ram.B.toString(16) + ram.C.toString(16));
    }
}
function run0x02() {
    //LD (BC), A
    write(ram.getBC(), ram.getA());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x02    LD (BC), A");
        console.log("(BC):" + read(ram.C + ram.B * 0b1_0000_0000).toString(16));
    }
}
function run0x03() {
    //INC BC
    let ret = alub16adder([ram.getB(), ram.getC()], [0, 1], 0, 0, 0, 0);
    ram.setBC(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x03 INC BC");
        console.log("BC:" + ram.B.toString(16) + ram.C.toString(16));
    }
}
function run0x04() {
    //INC B
    ram.setB(alub8adder(ram.getB(), 1, 1, 0, 1, 0));
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x04 INC B");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x05() {
    //DEC B
    ram.setB(alub8adder(ram.getB(), -1, 1, 0, -1, 0));
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x05 DEC B");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x06() {
    //LD B, n
    ram.setB(get_byte());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x06 LD B, n");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x07() {
    //RLCA
    ram.setA(rlc(ram.getA(), 0, 0, 0, 1));
    ram.Flag.Z = false;
    ram.Flag.N = false;
    ram.Flag.H = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x07 RLCA");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x08() {
    //LD (nn), SP
    let n1 = get_byte();
    let n2 = get_byte();
    let addr = combine_2b8(n2, n1);
    let bytes = split_b16(ram.getSP());
    write(addr, bytes[1]);
    write(addr+1, bytes[0]);
    
    cycles += 20;
    if (cpu_dump_intstr === 1) {
        console.log("0x08 LD (nn), SP");
        console.log("SP:" + ram.SP[0].toString(16) + ram.SP[1].toString(16));
    }
}
function run0x09() {
    //ADD HL, BC
    let ret = alub16adder([ram.getH(), ram.getL()], [ram.getB(), ram.getC()], 0, 0, 1, 1);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x09 ADD HL, BC");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x0A() {
    //LD A, (BC)
    ram.A = read(ram.getBC());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x0A LD A, (BC)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x0B() {
    //DEC BC
    let ret = alub16adder([ram.B, ram.C], [0, -1], 0, 0, 0, 0);
    ram.setBC(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x0B DEC BC");
        console.log("BC:" + ram.B.toString(16) + ram.C.toString(16));
    }
}
function run0x0C() {
    //INC C
    ram.C = alub8adder(ram.C, 1, 1, 0, 1, 0);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x0C INC C");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x0D() {
    //DEC C
    ram.C = alub8adder(ram.C, -1, 1, 0, -1, 0);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x0D DEC C");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x0E() {
    //LD C, n
    ram.C = get_byte();
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x0E LD C, n");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x0F() {
    //RRCA
    ram.A = rrc(ram.A, 0, 0, 0, 1);
    ram.Flag.Z = false;
    ram.Flag.N = false;
    ram.Flag.H = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x0F RRCA");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x10() {
    //STOP
    stopped = true;
    get_byte();
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x10 STOP");
    }
}
function run0x11() {
    //LD DE, nn
    let n1 = get_byte();
    let n2 = get_byte();
    ram.setDE(combine_2b8(n2, n1));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x11    LD DE, nn");
        console.log("DE:" + ram.D.toString(16) + ram.E.toString(16));
    }
}
function run0x12() {
    //LD (DE), A
    write(ram.getDE(), ram.A);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x12    LD (DE), A");
        console.log(
            "(DE):" + read(ram.E + ram.D * 0b1_0000_0000, 0).toString(16)
        );
    }
}
function run0x13() {
    //INC DE
    let ret = alub16adder([ram.D, ram.E], [0, 1], 0, 0, 0, 0);
    ram.setDE(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x13 INC DE");
        console.log("DE:" + ram.D.toString(16) + ram.E.toString(16));
    }
}
function run0x14() {
    //INC D
    ram.D = alub8adder(ram.D, 1, 1, 0, 1, 0);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x14 INC D");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x15() {
    //DEC D
    ram.D = alub8adder(ram.D, -1, 1, 0, -1, 0);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x15 DEC D");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x16() {
    //LD D, n
    ram.D = get_byte();
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x16 LD D, n");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x17() {
    //RLA
    ram.A = rl(ram.A, 0, 0, 0, 1);
    ram.Flag.Z = false;
    ram.Flag.N = false;
    ram.Flag.H = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x17 RLA");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x18() {
    //JR n
    let signed = get_byte();
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    pos += signed;
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x18 JR n");
        console.log("n:" + signed.toString(16));
        console.log("PC:" + pos.toString(16));
    }
}
function run0x19() {
    //ADD HL, DE
    let ret = alub16adder([ram.H, ram.L], [ram.D, ram.E], 0, 0, 1, 1);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x19 ADD HL, DE");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x1A() {
    //LD A, (DE)
    ram.A = read(ram.getDE());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x1A LD A, (DE)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x1B() {
    //DEC DE
    let ret = alub16adder([ram.D, ram.E], [0, -1], 0, 0, 0, 0);
    ram.setDE(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x1B DEC DE");
        console.log("DE:" + ram.D.toString(16) + ram.E.toString(16));
    }
}
function run0x1C() {
    //INC E
    ram.E = alub8adder(ram.E, 1, 1, 0, 1, 0);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x1C INC E");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x1D() {
    //DEC E
    ram.E = alub8adder(ram.E, -1, 1, 0, -1, 0);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x1D DEC E");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x1E() {
    //LD E, n
    ram.E = get_byte();
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x1E LD E, n");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x1F() {
    //RRA
    ram.A = rr(ram.A, 0, 0, 0, 1);
    ram.Flag.Z = false;
    ram.Flag.N = false;
    ram.Flag.H = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x1F RRA");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x20() {
    //JR NZ, n
    let signed = get_byte();
    
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    if (!ram.Flag.Z) {
        pos += signed;
        cycles += 12;
    } else {
        cycles += 8;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0x20 JR NZ, n");
        console.log("n:" + signed.toString(16));
        console.log("PC:" + pos.toString(16));
    }
}
function run0x21() {
    //LD HL, nn
    let n1 = get_byte();
    let n2 = get_byte();
    ram.setHL(combine_2b8(n2, n1));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x21    LD HL, nn");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x22() {
    //LDI (HL), A
    write(ram.getHL(), ram.A);
    let ret = alub16adder([ram.H, ram.L], [0, 1], 0, 0, 0, 0);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x22    LDI (HL), A");
        console.log("(HL):" + read(-1 + ram.L + ram.H * 0b1_0000_0000, 0).toString(16) );
        console.log("HL:" + ram.H.toString(16), ram.L.toString(16));
    }
}
function run0x23() {
    //INC HL
    let ret = alub16adder([ram.H, ram.L], [0, 1], 0, 0, 0, 0);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x23 INC HL");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x24() {
    //INC H
    ram.H = alub8adder(ram.H, 1, 1, 0, 1, 0);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x24 INC H");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x25() {
    //DEC H
    ram.H = alub8adder(ram.H, -1, 1, 0, -1, 0);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x25 DEC H");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x26() {
    //LD H, n
    ram.H = get_byte();
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x26 LD H, n");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x27() {
    //DAA
    DAA();
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x27 DAA");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x28() {
    //JR Z, n
    let signed = get_byte();
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    if (ram.Flag.Z) {
        pos += signed;
        cycles += 12;
    } else {
        cycles += 8;
    }

    if (cpu_dump_intstr === 1) {
        console.log("0x28 JR Z, n");
        console.log("n:" + signed.toString(16));
        console.log("PC:" + pos.toString(16));
    }
}
function run0x29() {
    //ADD HL, HL
    let ret = alub16adder([ram.H, ram.L], [ram.H, ram.L], 0, 0, 1, 1);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x29 ADD HL, HL");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x2A() {
    //LDI A, (HL)
    ram.A = read(ram.getHL());
    let ret = alub16adder([ram.H, ram.L], [0, 1], 0, 0, 0, 0);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x2A LDI A, (HL)");
        console.log("A:" + ram.A.toString(16));
        console.log("HL:" + ram.H.toString(16), ram.L.toString(16));
    }
}
function run0x2B() {
    //DEC HL
    let ret = alub16adder([ram.H, ram.L], [0, -1], 0, 0, 0, 0);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x2B DEC HL");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x2C() {
    //INC L
    ram.L = alub8adder(ram.L, 1, 1, 0, 1, 0);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x2C INC L");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x2D() {
    //DEC L
    ram.L = alub8adder(ram.L, -1, 1, 0, -1, 0);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x2D DEC L");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x2E() {
    //LD L, n
    ram.L = get_byte();
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x2E LD L, n");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x2F() {
    //CPL
    ram.A = ~ram.A;
    ram.Flag.N = true;
    ram.Flag.H = true;
    ram.A &= 0b1111_1111;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x2F CPL");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x30() {
    //JR NC, n
    let signed = get_byte();
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    if (!ram.Flag.C) {
        pos += signed;
        cycles += 12;
    } else {
        cycles += 8;
    }
    
    if (cpu_dump_intstr === 1) {
        console.log("0x30 JR NC, n");
        console.log("n:" + signed.toString(16));
        console.log("PC:" + pos.toString(16));
    }
}
function run0x31() {
    //LD SP, nn
    let n1 = get_byte();
    let n2 = get_byte();
    ram.setSP(combine_2b8(n2, n1));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x31    LD SP, nn");
        console.log("SP:" + ram.SP[0].toString(16) + ram.SP[1].toString(16));
    }
}
function run0x32() {
    //LDD (HL), A
    write(ram.getHL(), ram.A);
    let ret = alub16adder([ram.H, ram.L], [0, -1], 0, 0, 0, 0);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x32    LDD (HL), A");
        console.log("(HL):" + read(1 + ram.L + ram.H * 0b1_0000_0000, 0).toString(16));
        console.log("HL:" + ram.H.toString(16), ram.L.toString(16));
    }
}
function run0x33() {
    //INC SP
    ram.SP = alub16adder(ram.SP, [0, 1], 0, 0, 0, 0);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x33 INC SP");
        console.log("SP:" + ram.SP[0].toString(16) + ram.SP[1].toString(16));
    }
}
function run0x34() {
    //INC (HL)
    let adr = ram.getHL();
    write(adr, alub8adder(read(adr), 1, 1, 0, 1, 0));
    ram.Flag.N = false;
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x34 INC (HL)");
        console.log("(HL):" + read(adr, 0).toString(16));
    }
}
function run0x35() {
    //DEC (HL)
    let adr = ram.getHL();
    write(adr, alub8adder(read(adr), -1, 1, 0, -1, 0));
    ram.Flag.N = true;
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x35 DEC (HL)");
        console.log("(HL):" + read(adr, 0).toString(16));
    }
}
function run0x36() {
    //LD (HL), n
    write(ram.getHL(), get_byte());
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0x36 LD (HL), n");
        console.log(
            "(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16)
        );
    }
}
function run0x37() {
    //SCF
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x37 SCF");
    }
}
function run0x38() {
    //JR C, n
    let signed = get_byte();
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    if (ram.Flag.C) {
        pos += signed;
        cycles += 12;
    } else {
        cycles += 8;
    }
    
    if (cpu_dump_intstr === 1) {
        console.log("0x38 JR C, n");
        console.log("n:" + signed.toString(16));
        console.log("PC:" + pos.toString(16));
    }
}
function run0x39() {
    //ADD HL, SP
    let ret = alub16adder([ram.H, ram.L], ram.SP, 0, 0, 1, 1);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x39 ADD HL, SP");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0x3A() {
    //LDD A, (HL)
    ram.A = read(ram.getHL());
    let ret = alub16adder([ram.H, ram.L], [0, -1], 0, 0, 0, 0);
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x3A LDD A, (HL)");
        console.log("A:" + ram.A.toString(16));
        console.log("HL:" + ram.H.toString(16), ram.L.toString(16));
    }
}
function run0x3B() {
    //DEC SP
    ram.SP = alub16adder(ram.SP, [0, -1], 0, 0, 0, 0);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x3B DEC SP");
        console.log("SP:" + ram.SP[0].toString(16) + ram.SP[1].toString(16));
    }
}
function run0x3C() {
    //INC A
    ram.A = alub8adder(ram.A, 1, 1, 0, 1, 0);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x3C INC A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x3D() {
    //DEC A
    ram.A = alub8adder(ram.A, -1, 1, 0, -1, 0);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x3D DEC A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x3E() {
    //LD A, n
    ram.A = get_byte();
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x3E LD A, n");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x3F() {
    //CCF
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = !ram.Flag.C;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x37 SCF");
    }
}
function run0x40() {
    //LD B, B
    //Why does this exist?
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x40 LD B, B");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x41() {
    //LD B, C
    ram.B = ram.C;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x41 LD B, C");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x42() {
    //LD B, D
    ram.B = ram.D;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x42 LD B, D");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x43() {
    //LD B, E
    ram.B = ram.E;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x43 LD B, E");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x44() {
    //LD B, H
    ram.B = ram.H;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x44 LD B, H");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x45() {
    //LD B, L
    ram.B = ram.L;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x45 LD B, L");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x46() {
    //LD B, (HL)
    ram.B = read(ram.getHL());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x46 LD B, (HL)");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x47() {
    //LD B, A
    ram.B = ram.A;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x47 LD B, A");
        console.log("B:" + ram.B.toString(16));
    }
}
function run0x48() {
    //LD C, B
    ram.C = ram.B;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x48 LD C, B");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x49() {
    //LD C, C
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x49 LD C, C");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x4A() {
    //LD C, D
    ram.C = ram.D;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x4A LD C, D");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x4B() {
    //LD C, E
    ram.C = ram.E;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x4B LD C, E");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x4C() {
    //LD C, H
    ram.C = ram.H;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x4C LD C, H");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x4D() {
    //LD C, L
    ram.C = ram.L;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x4D LD C, L");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x4E() {
    //LD C, (HL)
    ram.C = read(ram.getHL());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x4E LD C, (HL)");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x4F() {
    //LD C, A
    ram.C = ram.A;
    cycles += 4;
    
    if (cpu_dump_intstr === 1) {
        console.log("0x4F LD C, A");
        console.log("C:" + ram.C.toString(16));
    }
}
function run0x50() {
    //LD D, B
    ram.D = ram.B;
    cycles += 4;
    
    if (cpu_dump_intstr === 1) {
        console.log("0x50 LD D, B");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x51() {
    //LD D, C
    ram.D = ram.C;
    cycles += 4;
    
    if (cpu_dump_intstr === 1) {
        console.log("0x51 LD D, C");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x52() {
    //LD D, D
    //Why?
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x52 LD D, D");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x53() {
    //LD D, E
    ram.D = ram.E;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x53 LD D, E");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x54() {
    //LD D, H
    ram.D = ram.H;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x54 LD D, H");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x55() {
    //LD D, L
    ram.D = ram.L;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x55 LD D, L");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x56() {
    //LD D, (HL)
    ram.D = read(ram.getHL());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x56 LD D, (HL)");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x57() {
    //LD D, A
    ram.D = ram.A;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x57 LD D, A");
        console.log("D:" + ram.D.toString(16));
    }
}
function run0x58() {
    //LD E, B
    ram.E = ram.B;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x58 LD E, B");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x59() {
    //LD E, C
    ram.E = ram.C;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x59 LD E, C");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x5A() {
    //LD E, D
    ram.E = ram.D;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x5A LD E, D");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x5B() {
    //LD E, E
    //Why?
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x5B LD E, E");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x5C() {
    //LD E, H
    ram.E = ram.H;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x5C LD E, H");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x5D() {
    //LD E, L
    ram.E = ram.L;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x5D LD E, L");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x5E() {
    //LD E, (HL)
    ram.E = read(ram.getHL());
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x5E LD E, (HL)");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x5F() {
    //LD E, A
    ram.E = ram.A;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x5F LD E, A");
        console.log("E:" + ram.E.toString(16));
    }
}
function run0x60() {
    //LD H, B
    ram.H = ram.B;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x60 LD H, B");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x61() {
    //LD H, C
    ram.H = ram.C;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x61 LD H, C");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x62() {
    //LD H, D
    ram.H = ram.D;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x62 LD H, D");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x63() {
    //LD H, E
    ram.H = ram.E;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x63 LD H, E");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x64() {
    //LD H, H
    //Why?
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x64 LD H, H");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x65() {
    //LD H, L
    ram.H = ram.L;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x65 LD H, L");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x66() {
    //LD H, (HL)
    ram.H = read(ram.getHL());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x66 LD H, (HL)");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x67() {
    //LD H, A
    ram.H = ram.A;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x67 LD H, A");
        console.log("H:" + ram.H.toString(16));
    }
}
function run0x68() {
    //LD L, B
    ram.L = ram.B;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x68 LD L, B");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x69() {
    //LD L, C
    ram.L = ram.C;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x69 LD L, C");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x6A() {
    //LD L, D
    ram.L = ram.D;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x6A LD L, D");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x6B() {
    //LD L, E
    ram.L = ram.E;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x6B LD L, E");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x6C() {
    //LD L, H
    ram.L = ram.H;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x6C LD L, H");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x6D() {
    //LD L, L
    //Why?
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x6D LD L, L");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x6E() {
    //LD L, (HL)
    ram.L = read(ram.getHL());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x6E LD L, (HL)");
        console.log("L" + ram.L.toString(16));
    }
}
function run0x6F() {
    //LD L, A
    ram.L = ram.A;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x6F LD L, A");
        console.log("L:" + ram.L.toString(16));
    }
}
function run0x70() {
    //LD (HL), B
    write(ram.getHL(), ram.B);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x70    LD (HL), B");
        console.log("(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16));
    }
}
function run0x71() {
    //LD (HL), C
    write(ram.getHL(), ram.C);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x71    LD (HL), C");
        console.log("(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16));
    }
}
function run0x72() {
    //LD (HL), D
    write(ram.getHL(), ram.D);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x72    LD (HL), D");
        console.log("(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16));
    }
}
function run0x73() {
    //LD (HL), E
    write(ram.getHL(), ram.E);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x73    LD (HL), E");
        console.log( "(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16)    );
    }
}
function run0x74() {
    //LD (HL), H
    write(ram.getHL(), ram.H);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x74    LD (HL), H");
        console.log(    "(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16) );
    }
}
function run0x75() {
    //LD (HL), L
    write(ram.getHL(), ram.L);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x75    LD (HL), L");
        console.log( "(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16) );
    }
}
function run0x76() {
    //HALT
    halt = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x76    HALT");
    }
}
function run0x77() {
    //LD (HL), A
    write(ram.getHL(), ram.A);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x77    LD (HL), A");
        console.log( "(HL):" + read(ram.L + ram.H * 0b1_0000_0000, 0).toString(16) );
    }
}
function run0x78() {
    //LD A, B
    ram.A = ram.B;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x78 LD A, B");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x79() {
    //LD A, C
    ram.A = ram.C;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x79 LD A, C");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x7A() {
    //LD A, D
    ram.A = ram.D;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x7A LD A, D");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x7B() {
    //LD A, E
    ram.A = ram.E;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x7B LD A, E");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x7C() {
    //LD A, H
    ram.A = ram.H;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x7C LD A, H");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x7D() {
    //LD A, L
    ram.A = ram.L;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x7D LD A, L");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x7E() {
    //LD A, (HL)
    ram.A = read(ram.getHL());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x7E LD A, (HL)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x7F() {
    //LD A, A
    //Why does this exist?
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x7F LD A, A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x80() {
    //ADD A, B
    ram.A = alub8adder(ram.A, ram.B, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x80 ADD A, B");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x81() {
    //ADD A, C
    ram.A = alub8adder(ram.A, ram.C, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x81 ADD A, C");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x82() {
    //ADD A, D
    ram.A = alub8adder(ram.A, ram.D, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x82 ADD A, D");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x83() {
    //ADD A, E
    ram.A = alub8adder(ram.A, ram.E, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x83 ADD A, E");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x84() {
    //ADD A, H
    ram.A = alub8adder(ram.A, ram.H, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x84 ADD A, H");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x85() {
    //ADD A, L
    ram.A = alub8adder(ram.A, ram.L, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x85 ADD A, L");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x86() {
    //ADD A, (HL)
    ram.A = alub8adder( ram.A, read(ram.getHL()), 1, 0, 1, 1 );
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x86 ADD A, (HL)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x87() {
    //ADD A, A
    ram.A = alub8adder(ram.A, ram.A, 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x87 ADD A, A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x88() {
    //ADC A, B
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.B, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x88 ADC A, B");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x89() {
    //ADC A, C
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.C, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x89 ADC A, C");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x8A() {
    //ADC A, D
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.D, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x8A ADC A, D");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x8B() {
    //ADC A, E
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.E, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x8B ADC A, E");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x8C() {
    //ADC A, H
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.H, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x8C ADC A, H");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x8D() {
    //ADC A, L
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.L, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x8D ADC A, L");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x8E() {
    //ADC A, (HL)
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(read(ram.getHL()), car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x8E ADC A, (HL)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x8F() {
    //ADC A, A
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(ram.A, car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x8F ADC A, A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x90() {
    //SUB A, B
    ram.A = alub8adder(ram.A, -ram.B, 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x90 SUB A, B");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x91() {
    //SUB A, C
    ram.A = alub8adder(ram.A, -ram.C, 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x91 SUB A, C");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x92() {
    //SUB A, D
    ram.A = alub8adder(ram.A, -ram.D, 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x92 SUB A, D");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x93() {
    //SUB A, E
    ram.A = alub8adder(ram.A, -ram.E, 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x93 SUB A, E");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x94() {
    //SUB A, H
    ram.A = alub8adder(ram.A, -ram.H, 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x94 SUB A, H");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x95() {
    //SUB A, L
    ram.A = alub8adder(ram.A, -ram.L, 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x95 SUB A, L");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x96() {
    //SUB A, (HL)
    ram.A = alub8adder( ram.A, -read(ram.getHL()), 1, 0, -1, -1 );
    ram.Flag.N = true;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x96 SUB A, (HL)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x97() {
    //SUB A, A
    //ram.A = alub8adder(ram.A, -ram.A, 1, 0, -1, -1);
    ram.A = 0;
    ram.Flag.Z = true;
    ram.Flag.N = true;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x97 SUB A, A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x98() {
    //SBC A, B
    sbcA(ram.B);
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x98 SBC A, B");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x99() {
    //SBC A, C
    sbcA(ram.C);
    
    if (cpu_dump_intstr === 1) {
        console.log("0x99 SBC A, C");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x9A() {
    //SBC A, D
    sbcA(ram.D);
    
    if (cpu_dump_intstr === 1) {
        console.log("0x9A SBC A, D");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x9B() {
    //SBC A, E
    sbcA(ram.E);
    
    if (cpu_dump_intstr === 1) {
        console.log("0x9B SBC A, E");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x9C() {
    //SBC A, H
    sbcA(ram.H);
    
    if (cpu_dump_intstr === 1) {
        console.log("0x9C SBC A, H");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x9D() {
    //SBC A, L
    sbcA(ram.L);
    
    if (cpu_dump_intstr === 1) {
        console.log("0x9D SBC A, L");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x9E() {
    //SBC A, (HL)
    sbcA(read(ram.getHL()));
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0x9E SBC A, (HL)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0x9F() {
    //SBC A, A
    sbcA(ram.A);
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0x9F SBC A, A");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xA0() {
    //AND A, B
    ram.A = ram.A & ram.B;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA0 AND A, B");
        console.log("A:" + ram.A);
    }
}
function run0xA1() {
    //AND A, C
    ram.A = ram.A & ram.C;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA1 AND A, C");
        console.log("A:" + ram.A);
    }
}
function run0xA2() {
    //AND A, D
    ram.A = ram.A & ram.D;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA2 AND A, D");
        console.log("A:" + ram.A);
    }
}
function run0xA3() {
    //AND A, E
    ram.A = ram.A & ram.E;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA3 AND A, E");
        console.log("A:" + ram.A);
    }
}
function run0xA4() {
    //AND A, H
    ram.A = ram.A & ram.H;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA4 AND A, H");
        console.log("A:" + ram.A);
    }
}
function run0xA5() {
    //AND A, L
    ram.A = ram.A & ram.L;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA5 AND A, L");
        console.log("A:" + ram.A);
    }
}
function run0xA6() {
    //AND A, (HL)
    ram.A = ram.A & read(ram.getHL());
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xA6 AND A, (HL)");
        console.log("A:" + ram.A);
    }
}
function run0xA7() {
    //AND A, A
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA7 AND A, A");
        console.log("A:" + ram.A);
    }
}
function run0xA8() {
    //XOR A, B
    ram.A = ram.A ^ ram.B;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA8 XOR A, B");
        console.log("A:" + ram.A);
    }
}
function run0xA9() {
    //XOR A, C
    ram.A = ram.A ^ ram.C;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xA9 XOR A, C");
        console.log("A:" + ram.A);
    }
}
function run0xAA() {
    //XOR A, D
    ram.A = ram.A ^ ram.D;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xAA XOR A, D");
        console.log("A:" + ram.A);
    }
}
function run0xAB() {
    //XOR A, E
    ram.A = ram.A ^ ram.E;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xAB XOR A, E");
        console.log("A:" + ram.A);
    }
}
function run0xAC() {
    //XOR A, H
    ram.A = ram.A ^ ram.H;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xAC XOR A, H");
        console.log("A:" + ram.A);
    }
}
function run0xAD() {
    //XOR A, L
    ram.A = ram.A ^ ram.L;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xAD XOR A, L");
        console.log("A:" + ram.A);
    }
}
function run0xAE() {
    //XOR A, (HL)
    ram.A = ram.A ^ read(ram.getHL());
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xAE XOR A, (HL)");
        console.log("A:" + ram.A);
    }
}
function run0xAF() {
    //XOR A, A
    ram.A = 0;
    ram.Flag.Z = true;
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xAF XOR A, A");
        console.log("A:" + ram.A);
    }
}
function run0xB0() {
    //OR A, B
    ram.A = ram.A | ram.B;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB0 OR A, B");
        console.log("A:" + ram.A);
    }
}
function run0xB1() {
    //OR A, C
    ram.A = ram.A | ram.C;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB1 OR A, C");
        console.log("A:" + ram.A);
    }
}
function run0xB2() {
    //OR A, D
    ram.A = ram.A | ram.D;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB2 OR A, D");
        console.log("A:" + ram.A);
    }
}
function run0xB3() {
    //OR A, E
    ram.A = ram.A | ram.E;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB3 OR A, E");
        console.log("A:" + ram.A);
    }
}
function run0xB4() {
    //OR A, H
    ram.A = ram.A | ram.H;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB4 OR A, H");
        console.log("A:" + ram.A);
    }
}
function run0xB5() {
    //OR A, L
    ram.A = ram.A | ram.L;
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB5 OR A, L");
        console.log("A:" + ram.A);
    }
}
function run0xB6() {
    //OR A, (HL)
    ram.A = ram.A | read(ram.getHL());
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xB6 OR A, (HL)");
        console.log("A:" + ram.A);
    }
}
function run0xB7() {
    //OR A, A
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB7 OR A, A");
    }
}
function run0xB8() {
    //CP A, B
    if (ram.A === ram.B) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (ram.B & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < ram.B) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB8 CP A, B");
    }
}
function run0xB9() {
    //CP A, C
    if (ram.A === ram.C) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (ram.C & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < ram.C) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xB9 CP A, C");
    }
}
function run0xBA() {
    //CP A, D
    if (ram.A === ram.D) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (ram.D & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < ram.D) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xBA CP A, D");
    }
}
function run0xBB() {
    //CP A, E
    if (ram.A === ram.E) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (ram.E & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < ram.E) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xBB CP A, E");
    }
}
function run0xBC() {
    //CP A, H
    if (ram.A === ram.H) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (ram.H & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < ram.H) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xBC CP A, H");
    }
}
function run0xBD() {
    //CP A, L
    if (ram.A === ram.L) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (ram.L & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < ram.L) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xBD CP A, L");
    }
}
function run0xBE() {
    //CP A, (HL)
    let rd = read(ram.getHL());
    if (ram.A === rd) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (rd & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < rd) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xBE CP A, (HL)");
    }
}
function run0xBF() {
    //CP A, A
    //Why?!?!?
    ram.Flag.Z = true;
    ram.Flag.N = true;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xBF CP A, A");
    }
}
function run0xC0() {
    //RET NZ
    if (!ram.Flag.Z) {
        let ret = stackpopb16();
        pos = combine_2b8(ret[0], ret[1]);
        cycles += 20;
    } else {
        
        cycles += 8;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xC0 RET NZ");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xC1() {
    //POP BC
    let ret = stackpopb16();
    ram.setBC(combine_2b8(ret[0], ret[1]));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xC1 POP BC");
        console.log("BC:" + ram.B.toString(16) + ram.C.toString(16));
    }
}
function run0xC2() {
    //JP NZ, nn
    let n1 = get_byte();
    let n2 = get_byte();
    if (!ram.Flag.Z) {
        pos = combine_2b8(n2, n1);
        cycles += 16;
    } else {
        cycles += 12;
        
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xC2 JP NZ,nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xC3() {
    //JP nn
    let n1 = get_byte();
    let n2 = get_byte();
    pos = combine_2b8(n2, n1);
    cycles += 16;
    
    if (cpu_dump_intstr === 1) {
        console.log("0xC3 JP nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xC4() {
    //CALL NZ, nn
    let n1 = get_byte();
    let n2 = get_byte();
    
    if (!ram.Flag.Z) {
        let ret = split_b16(pos);
        stackpushb16([ret[0], ret[1]]);
        pos = combine_2b8(n2, n1);
        cycles += 24;
    } else {
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xC4 CALL NZ, nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xC5() {
    //PUSH BC
    stackpushb16([ram.B, ram.C]);
    
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xC5 PUSH BC");
    }
}
function run0xC6() {
    //ADD A, n
    ram.A = alub8adder(ram.A, get_byte(), 1, 0, 1, 1);
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xC6 ADD A, n");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xC7() {
    //RST 00
    
    stackpushb16(split_b16(pos));
    pos = 0x00;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xC7 RST 00");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xC8() {
    //RET Z
    if (ram.Flag.Z) {
        let ret = stackpopb16();
        pos = combine_2b8(ret[0], ret[1]);
        cycles += 20;
    } else {
        
        cycles += 8;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xC8 RET Z");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xC9() {
    //RET
    let ret = stackpopb16();
    pos = combine_2b8(ret[0], ret[1]);
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xC9 RET");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xCA() {
    //JP Z, nn
    let n1 = get_byte();
    let n2 = get_byte();
    if (ram.Flag.Z) {
        pos = combine_2b8(n2, n1);
        cycles += 16;
    } else {
        
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xCA JP Z,nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xCB() {
    //Prefix CB
    cycles += 8;
    Flag.Z = ram.Flag.Z;
    Flag.N = ram.Flag.N;
    Flag.H = ram.Flag.H;
    Flag.C = ram.Flag.C;
    
    let instruct = get_byte();
    if (cpu_dump_intstr === 1) {
        console.log(pos.toString(16) + ": CB " + instruct.toString(16));
    }
    if (dis_unimp_opcode === 0) {
        switch (instruct & 0b0000_1111) {
            case 0:
                ram.B = cb_array[(instruct & 0b1111_1000) >> 3](ram.B);
                break;
            case 1:
                ram.C = cb_array[(instruct & 0b1111_1000) >> 3](ram.C);
                break;
            case 2:
                ram.D = cb_array[(instruct & 0b1111_1000) >> 3](ram.D);
                break;
            case 3:
                ram.E = cb_array[(instruct & 0b1111_1000) >> 3](ram.E);
                break;
            case 4:
                ram.H = cb_array[(instruct & 0b1111_1000) >> 3](ram.H);
                break;
            case 5:
                ram.L = cb_array[(instruct & 0b1111_1000) >> 3](ram.L);
                break;
            case 6:
                cycles += 8;
                if (instruct >= 0x40 && instruct < 0x80) {
                    cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL()));
                } else {
                    write(ram.getHL(), cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL())));
                }
                break;
            case 7:
                ram.A = cb_array[(instruct & 0b1111_1000) >> 3](ram.A);
                break;
            case 8:
                ram.B = cb_array[(instruct & 0b1111_1000) >> 3](ram.B);
                break;
            case 9:
                ram.C = cb_array[(instruct & 0b1111_1000) >> 3](ram.C);
                break;
            case 10:
                ram.D = cb_array[(instruct & 0b1111_1000) >> 3](ram.D);
                break;
            case 11:
                ram.E = cb_array[(instruct & 0b1111_1000) >> 3](ram.E);
                break;
            case 12:
                ram.H = cb_array[(instruct & 0b1111_1000) >> 3](ram.H);
                break;
            case 13:
                ram.L = cb_array[(instruct & 0b1111_1000) >> 3](ram.L);
                break;
            case 14:
                cycles += 8;
                if (instruct >= 0x40 && instruct < 0x80) {
                    cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL()));
                } else {
                    write(ram.getHL(), cb_array[(instruct & 0b1111_1000) >> 3]( read(ram.getHL()) ) );
                }
                break;
            case 15:
                ram.A = cb_array[(instruct & 0b1111_1000) >> 3](ram.A);
                break;
            default:
                alert("The laws of math are breaking down.");
        }
    } else {
        try {
            switch (instruct & 0b0000_1111) {
                case 0:
                    ram.B = cb_array[(instruct & 0b1111_1000) >> 3](ram.B);
                    break;
                case 1:
                    ram.C = cb_array[(instruct & 0b1111_1000) >> 3](ram.C);
                    break;
                case 2:
                    ram.D = cb_array[(instruct & 0b1111_1000) >> 3](ram.D);
                    break;
                case 3:
                    ram.E = cb_array[(instruct & 0b1111_1000) >> 3](ram.E);
                    break;
                case 4:
                    ram.H = cb_array[(instruct & 0b1111_1000) >> 3](ram.H);
                    break;
                case 5:
                    ram.L = cb_array[(instruct & 0b1111_1000) >> 3](ram.L);
                    break;
                case 6:
                    cycles += 8;
                    if (instruct >= 0x40 && instruct < 0x80) {
                        cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL()));
                    } else {
                        write(ram.getHL(), cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL())));
                    }
                    break;
                case 7:
                    ram.A = cb_array[(instruct & 0b1111_1000) >> 3](ram.A);
                    break;
                case 8:
                    ram.B = cb_array[(instruct & 0b1111_1000) >> 3](ram.B);
                    break;
                case 9:
                    ram.C = cb_array[(instruct & 0b1111_1000) >> 3](ram.C);
                    break;
                case 10:
                    ram.D = cb_array[(instruct & 0b1111_1000) >> 3](ram.D);
                    break;
                case 11:
                    ram.E = cb_array[(instruct & 0b1111_1000) >> 3](ram.E);
                    break;
                case 12:
                    ram.H = cb_array[(instruct & 0b1111_1000) >> 3](ram.H);
                    break;
                case 13:
                    ram.L = cb_array[(instruct & 0b1111_1000) >> 3](ram.L);
                    break;
                case 14:
                    cycles += 8;
                    if (instruct >= 0x40 && instruct < 0x80) {
                        cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL()));
                    } else {
                        write(
                            ram.getHL(),
                            cb_array[(instruct & 0b1111_1000) >> 3](read(ram.getHL()))
                        );
                    }
                    break;
                case 15:
                    ram.A = cb_array[(instruct & 0b1111_1000) >> 3](ram.A);
                    break;
                default:
                    alert("The laws of math are breaking down.");
            }
        } catch (err) {
            alert("Unimplemented opc-code: CB " + instruct.toString(16));
            alert(cb_array[(instruct & 0b1111_1000) >> 3]);
            break_loop = true;
            return;
        }
    }
    
    ram.Flag.Z = Flag.Z;
    ram.Flag.N = Flag.N;
    ram.Flag.H = Flag.H;
    ram.Flag.C = Flag.C;
}
function run0xCC() {
    //CALL Z, nn
    let n1 = get_byte();
    let n2 = get_byte();
    if (ram.Flag.Z) {
        stackpushb16(split_b16(pos));
        pos = combine_2b8(n2, n1);
        cycles += 24;
    } else {
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xCC CALL Z, nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xCD() {
    //CALL nn
    let n1 = get_byte();
    let n2 = get_byte();
    
    stackpushb16(split_b16(pos));
    pos = combine_2b8(n2, n1);
    cycles += 24;
    if (cpu_dump_intstr === 1) {
        console.log("0xCD CALL nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xCE() {
    //ADC A, n
    let car = 0;
    if (ram.Flag.C) {
        car = 1;
    }
    let keepH = false;
    let keepC = false;
    let to_add = alub8adder(get_byte(), car, 1, 0, 1, 1);
    if (ram.Flag.H) {
        keepH = true;
    }
    if (ram.Flag.C) {
        keepC = true;
    }
    ram.A = alub8adder(ram.A, to_add, 1, 0, 1, 1);
    if (keepH) {
        ram.Flag.H = true;
    }
    if (keepC) {
        ram.Flag.C = true;
    }
    ram.Flag.N = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xCE ADC A, n");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xCF() {
    //RST 08
    
    stackpushb16(split_b16(pos));
    pos = 0x08;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xCF RST 08");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xD0() {
    //RET NC
    if (!ram.Flag.C) {
        let ret = stackpopb16();
        pos = combine_2b8(ret[0], ret[1]);
        cycles += 20;
    } else {
        
        cycles += 8;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xD0 RET NC");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xD1() {
    //POP DE
    let ret = stackpopb16();
    ram.setDE(combine_2b8(ret[0], ret[1]));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xD1 POP DE");
        console.log("DE:" + ram.D.toString(16) + ram.E.toString(16));
    }
}
function run0xD2() {
    //JP NC, nn
    let n1 = get_byte();
    let n2 = get_byte();
    if (!ram.Flag.C) {
        pos = combine_2b8(n2, n1);
        cycles += 16;
    } else {
        
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xD2 JP NC,nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xD3() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xD4() {
    //CALL NC, nn
    let n1 = get_byte();
    let n2 = get_byte();
    
    if (!ram.Flag.C) {
        stackpushb16(split_b16(pos));
        pos = combine_2b8(n2, n1);
        cycles += 24;
    } else {
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xD4 CALL NC, nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xD5() {
    //PUSH DE
    stackpushb16([ram.D, ram.E]);
    
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xD5 PUSH DE");
    }
}
function run0xD6() {
    //SUB A, n
    ram.A = alub8adder(ram.A, -get_byte(), 1, 0, -1, -1);
    ram.Flag.N = true;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xD6 SUB A, n");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xD7() {
    //RST 10

    stackpushb16(split_b16(pos));
    pos = 0x10;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xD7 RST 10");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xD8() {
    //RET C
    if (ram.Flag.C) {
        let ret = stackpopb16();
        pos = combine_2b8(ret[0], ret[1]);
        cycles += 20;
    } else {
        cycles += 8;
        
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xD8 RET C");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xD9() {
    //RETI
    
    let ret = stackpopb16();
    pos = combine_2b8(ret[0], ret[1]);
    interrupts_delayed_true = true;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xD9 RETI");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xDA() {
    //JP C, nn
    let n1 = get_byte();
    let n2 = get_byte();
    if (ram.Flag.C) {
        pos = combine_2b8(n2, n1);
        cycles += 16;
    } else {
        
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xDA JP C,nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xDB() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xDC() {
    //CALL C, nn
    let n1 = get_byte();
    let n2 = get_byte();
    
    if (ram.Flag.C) {
        stackpushb16(split_b16(pos));
        pos = combine_2b8(n2, n1);
        cycles += 24;
    } else {
        cycles += 12;
    }
    if (cpu_dump_intstr === 1) {
        console.log("0xDC CALL C, nn");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xDD() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xDE() {
    //SBC A, n
    sbcA(get_byte());
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xDE SBC A, n");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xDF() {
    //RST 18
    
    stackpushb16(split_b16(pos));
    pos = 0x18;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xDF RST 18");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xE0() {
    //LDH (n), A
    write(0xff00 + get_byte(), ram.A);
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xE0 LDH (n), A");
        console.log("(n):" + ram.A.toString(16));
    }
}
function run0xE1() {
    //POP HL
    let ret = stackpopb16();
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xE1 POP HL");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0xE2() {
    //LDH (C), A
    write(0xff00 + ram.C, ram.A);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xE2 LDH (C), A");
        console.log("(C):" + ram.A.toString(16));
    }
}
function run0xE3() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xE4() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xE5() {
    //PUSH HL
    stackpushb16([ram.H, ram.L]);
    
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xE5 PUSH HL");
    }
}
function run0xE6() {
    //AND A, n
    ram.A = ram.A & get_byte();
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = true;
    ram.Flag.C = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xE6 AND A, n");
        console.log("A:" + ram.A);
    }
}
function run0xE7() {
    //RST 20
    
    stackpushb16(split_b16(pos));
    pos = 0x20;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xE7 RST 20");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xE8() {
    //ADD SP, n
    let signed = get_byte();
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    let old_SP0 = ram.getSP();
    if (signed >= 0) {
        ram.SP[1] = alub8adder(ram.SP[1], signed, 0, 0, 1, 1);
        if (ram.Flag.C) {
            ram.SP[0] = alub8adder(ram.SP[0], 1, 0, 0, 0, 0);
        }
    }else {
        ram.SP[1] = alub8adder(ram.SP[1], signed, 0, 0, -1, -1);
        if (ram.Flag.C) {
            ram.SP[0] = alub8adder(ram.SP[0], -1, 0, 0, 0, 0);
        }

        let sudo_SP0 = old_SP0+signed;
        if ((sudo_SP0 & 0xFF) <= (old_SP0 & 0xFF)) {
            ram.Flag.C = true;
        }else {
            ram.Flag.C = false;
        }
        if ((sudo_SP0 & 0xF) <= (old_SP0 & 0xF)) {
            ram.Flag.H = true;
        }else {
            ram.Flag.H = false;
        }
    }
    ram.Flag.Z = false;
    ram.Flag.N = false;
    
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xE8 ADD SP, n");
        console.log("SP:" + ram.SP[0].toString(16) + ram.SP[1].toString(16));
    }
}
function run0xE9() {
    //JP HL
    pos = ram.getHL();
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xE9 JP HL");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xEA() {
    //LD (nn), A
    let n1 = get_byte();
    let n2 = get_byte();
    write(combine_2b8(n2, n1), ram.A);

    // console.log("EA");
    // console.log(n2.toString(16).padStart(2, "0")+n1.toString(16).padStart(2, "0"));
    // console.log(combine_2b8(n2, n1).toString(16).padStart(4, "0"));
    
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xEA    LD (nn), A");
        console.log("(nn):" + read(n1 + n2 * 0b1_0000_0000, 0).toString(16));
    }
}
function run0xEB() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xEC() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xED() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xEE() {
    //XOR A, n
    ram.A = ram.A ^ get_byte();
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xEE XOR A, n");
        console.log("A:" + ram.A);
    }
}
function run0xEF() {
    //RST 28
    
    stackpushb16(split_b16(pos));
    pos = 0x28;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xEF RST 28");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xF0() {
    //LDH A, (n)
    ram.A = read(0xff00 + get_byte());
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xF0 LDH A, (n)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xF1() {
    //POP AF
    let ret = stackpopb16();
    ram.A = ret[0];
    ram.Flag.Z = Boolean((ret[1] & 0b1000_0000) >> 7 === 1);
    ram.Flag.N = Boolean((ret[1] & 0b0100_0000) >> 6 === 1);
    ram.Flag.H = Boolean((ret[1] & 0b0010_0000) >> 5 === 1);
    ram.Flag.C = Boolean((ret[1] & 0b0001_0000) >> 4 === 1);
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xF1 POP AF");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xF2() {
    //LDH A, (C)
    ram.A = read(0xff00 + ram.C);
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xF2 LDH A, (C)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xF3() {
    //DI
    interrupts = false;
    interrupts_delayed_true = false;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xF3 DI");
    }
}
function run0xF4() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xF5() {
    //PUSH AF
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
    stackpushb16([ram.A, (z * 0b1000_0000 + n * 0b0100_0000 + h * 0b0010_0000 + c * 0b0001_0000)]);
    
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xF5 PUSH AF");
    }
}
function run0xF6() {
    //OR A, n
    ram.A = ram.A | get_byte();
    if (ram.A === 0) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = false;
    ram.Flag.H = false;
    ram.Flag.C = false;
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xF6 OR A, n");
        console.log("A:" + ram.A);
    }
}
function run0xF7() {
    //RST 30
    
    stackpushb16(split_b16(pos));
    pos = 0x30;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xF7 RST 30");
        console.log("PC:" + pos.toString(16));
    }
}
function run0xF8() {
    //LD HL, SP+n
    let signed = get_byte();
    if (signed >= 0b1000_0000) {
        signed = -(~(signed - 1) & 0b1111_1111);
    }
    let old_SP0 = ram.getSP();
    let ret = Array.from(ram.SP);
    if (signed >= 0) {
        ret[1] = alub8adder(ret[1], signed, 0, 0, 1, 1);
        if (ram.Flag.C) {
            ret[0] = alub8adder(ret[0], 1, 0, 0, 0, 0);
        }
    }else {
        ret[1] = alub8adder(ret[1], signed, 0, 0, -1, -1);
        if (ram.Flag.C) {
            ret[0] = alub8adder(ret[0], -1, 0, 0, 0, 0);
        }

        let sudo_SP0 = old_SP0+signed;
        if ((sudo_SP0 & 0xFF) <= (old_SP0 & 0xFF)) {
            ram.Flag.C = true;
        }else {
            ram.Flag.C = false;
        }
        if ((sudo_SP0 & 0xF) <= (old_SP0 & 0xF)) {
            ram.Flag.H = true;
        }else {
            ram.Flag.H = false;
        }
    }
    ram.Flag.Z = false;
    ram.Flag.N = false;
    ram.setHL(combine_2b8(ret[0], ret[1]));
    
    cycles += 12;
    if (cpu_dump_intstr === 1) {
        console.log("0xF8 LD HL, SP+n");
        console.log("HL:" + ram.H.toString(16) + ram.L.toString(16));
    }
}
function run0xF9() {
    //LD SP, HL
    
    ram.SP = [ram.H, ram.L];
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xF9 LD SP, HL");
        console.log("SP:" + ram.SP[0].toString(16) + ram.SP[1].toString(16));
    }
}
function run0xFA() {
    //LD A, (nn)
    let n1 = get_byte();
    let n2 = get_byte();
    ram.A = read(combine_2b8(n2, n1));
    
    // console.log("FA");
    // console.log(n2.toString(16).padStart(2, "0")+n1.toString(16).padStart(2, "0"));
    // console.log(combine_2b8(n2, n1).toString(16).padStart(4, "0"));

    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xFA LD A, (nn)");
        console.log("A:" + ram.A.toString(16));
    }
}
function run0xFB() {
    //EI
    interrupts_delayed_true = true;
    // cpu_abort = true;
    
    cycles += 4;
    if (cpu_dump_intstr === 1) {
        console.log("0xFB EI");
    }
}
function run0xFC() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xFD() {
    //This is not a valid opcode
    cpu_abort = true;
    alert("Something has gone badly wrong. This is an invalid opcode. At " + pos);
}
function run0xFE() {
    //CP A, n
    let rd = get_byte();
    if (ram.A === rd) {
        ram.Flag.Z = true;
    } else {
        ram.Flag.Z = false;
    }
    ram.Flag.N = true;
    if ((ram.A & 0b0000_1111) < (rd & 0b0000_1111)) {
        ram.Flag.H = true;
    } else {
        ram.Flag.H = false;
    }
    if (ram.A < rd) {
        ram.Flag.C = true;
    } else {
        ram.Flag.C = false;
    }
    
    cycles += 8;
    if (cpu_dump_intstr === 1) {
        console.log("0xFE CP A, n");
        console.log("n:" + rd);
    }
}
function run0xFF() {
    //RST 38
    
    stackpushb16(split_b16(pos));
    pos = 0x38;
    cycles += 16;
    if (cpu_dump_intstr === 1) {
        console.log("0xFF RST 38");
        console.log("PC:" + pos.toString(16));
    }
}

let instruct_array = [
    run0x00,
    run0x01,
    run0x02,
    run0x03,
    run0x04,
    run0x05,
    run0x06,
    run0x07,
    run0x08,
    run0x09,
    run0x0A,
    run0x0B,
    run0x0C,
    run0x0D,
    run0x0E,
    run0x0F,
    run0x10,
    run0x11,
    run0x12,
    run0x13,
    run0x14,
    run0x15,
    run0x16,
    run0x17,
    run0x18,
    run0x19,
    run0x1A,
    run0x1B,
    run0x1C,
    run0x1D,
    run0x1E,
    run0x1F,
    run0x20,
    run0x21,
    run0x22,
    run0x23,
    run0x24,
    run0x25,
    run0x26,
    run0x27,
    run0x28,
    run0x29,
    run0x2A,
    run0x2B,
    run0x2C,
    run0x2D,
    run0x2E,
    run0x2F,
    run0x30,
    run0x31,
    run0x32,
    run0x33,
    run0x34,
    run0x35,
    run0x36,
    run0x37,
    run0x38,
    run0x39,
    run0x3A,
    run0x3B,
    run0x3C,
    run0x3D,
    run0x3E,
    run0x3F,
    run0x40,
    run0x41,
    run0x42,
    run0x43,
    run0x44,
    run0x45,
    run0x46,
    run0x47,
    run0x48,
    run0x49,
    run0x4A,
    run0x4B,
    run0x4C,
    run0x4D,
    run0x4E,
    run0x4F,
    run0x50,
    run0x51,
    run0x52,
    run0x53,
    run0x54,
    run0x55,
    run0x56,
    run0x57,
    run0x58,
    run0x59,
    run0x5A,
    run0x5B,
    run0x5C,
    run0x5D,
    run0x5E,
    run0x5F,
    run0x60,
    run0x61,
    run0x62,
    run0x63,
    run0x64,
    run0x65,
    run0x66,
    run0x67,
    run0x68,
    run0x69,
    run0x6A,
    run0x6B,
    run0x6C,
    run0x6D,
    run0x6E,
    run0x6F,
    run0x70,
    run0x71,
    run0x72,
    run0x73,
    run0x74,
    run0x75,
    run0x76,
    run0x77,
    run0x78,
    run0x79,
    run0x7A,
    run0x7B,
    run0x7C,
    run0x7D,
    run0x7E,
    run0x7F,
    run0x80,
    run0x81,
    run0x82,
    run0x83,
    run0x84,
    run0x85,
    run0x86,
    run0x87,
    run0x88,
    run0x89,
    run0x8A,
    run0x8B,
    run0x8C,
    run0x8D,
    run0x8E,
    run0x8F,
    run0x90,
    run0x91,
    run0x92,
    run0x93,
    run0x94,
    run0x95,
    run0x96,
    run0x97,
    run0x98,
    run0x99,
    run0x9A,
    run0x9B,
    run0x9C,
    run0x9D,
    run0x9E,
    run0x9F,
    run0xA0,
    run0xA1,
    run0xA2,
    run0xA3,
    run0xA4,
    run0xA5,
    run0xA6,
    run0xA7,
    run0xA8,
    run0xA9,
    run0xAA,
    run0xAB,
    run0xAC,
    run0xAD,
    run0xAE,
    run0xAF,
    run0xB0,
    run0xB1,
    run0xB2,
    run0xB3,
    run0xB4,
    run0xB5,
    run0xB6,
    run0xB7,
    run0xB8,
    run0xB9,
    run0xBA,
    run0xBB,
    run0xBC,
    run0xBD,
    run0xBE,
    run0xBF,
    run0xC0,
    run0xC1,
    run0xC2,
    run0xC3,
    run0xC4,
    run0xC5,
    run0xC6,
    run0xC7,
    run0xC8,
    run0xC9,
    run0xCA,
    run0xCB,
    run0xCC,
    run0xCD,
    run0xCE,
    run0xCF,
    run0xD0,
    run0xD1,
    run0xD2,
    run0xD3,
    run0xD4,
    run0xD5,
    run0xD6,
    run0xD7,
    run0xD8,
    run0xD9,
    run0xDA,
    run0xDB,
    run0xDC,
    run0xDD,
    run0xDE,
    run0xDF,
    run0xE0,
    run0xE1,
    run0xE2,
    run0xE3,
    run0xE4,
    run0xE5,
    run0xE6,
    run0xE7,
    run0xE8,
    run0xE9,
    run0xEA,
    run0xEB,
    run0xEC,
    run0xED,
    run0xEE,
    run0xEF,
    run0xF0,
    run0xF1,
    run0xF2,
    run0xF3,
    run0xF4,
    run0xF5,
    run0xF6,
    run0xF7,
    run0xF8,
    run0xF9,
    run0xFA,
    run0xFB,
    run0xFC,
    run0xFD,
    run0xFE,
    run0xFF
];

function prepare_cpu(rom) {
    setup(rom);
    if (!run_boot_rom) {
        ram.A = 1;
        ram.Flag.Z = true;
        ram.Flag.N = false;
        ram.Flag.H = true;
        ram.Flag.C = true;
        ram.C = 0x13;
        ram.B = 0;
        ram.E = 0xd8;
        ram.D = 0;
        ram.L = 0x4d;
        ram.H = 1;
        ram.SP = [0xff, 0xfe];
        //write(0xFF05, 0, 0);
        //write(0xFF06, 0, 0);
        //write(0xFF07, 0, 0);
        write(0xff10, 0x80, 0);
        write(0xff11, 0xbf, 0);
        write(0xff12, 0xf3, 0);
        write(0xff14, 0xbf, 0);
        write(0xff16, 0x3f, 0);
        write(0xff17, 0x00, 0);
        write(0xff19, 0xbf, 0);
        write(0xff1a, 0x7f, 0);
        write(0xff1b, 0xff, 0);
        write(0xff1c, 0x9f, 0);
        write(0xff1e, 0xbf, 0);
        write(0xff20, 0xff, 0);
        //write(0xFF21, 0, 0);
        //write(0xFF22, 0, 0);
        write(0xff23, 0xbf, 0);
        write(0xff24, 0x77, 0);
        write(0xff25, 0xf3, 0);
        write(0xff26, 0xf1, 0);
        write(0xff40, 0x91, 0);
        //write(0xFF42, 0, 0);
        //write(0xFF43, 0, 0);
        //write(0xFF45, 0, 0);
        write(0xff47, 0xfc, 0);
        write(0xff48, 0xff, 0);
        write(0xff49, 0xff, 0);
        //write(0xFF4A, 0, 0);
        //write(0xFF4B, 0, 0);
        //write(0xFFFF, 0, 0);
    }
}

function show_debug_log() {
    let i = log_pos.valueAsNumber;
    let last_instr = "";
    if (err_log[i].instr !== 0xcb) {
        last_instr = instruct_array[err_log[i].instr];
    } else {
        last_instr = " (CB " + err_log[i].arg1.toString(16).padStart(2, "0") + ") " + cb_array[(err_log[i].arg1 & 0b1111_1000) >> 3];
    }
    let super_string = "";
    try {
        super_string += "<p>Old PC: 0x" + err_log[i].orgpos.toString(16).padStart(4, "0");
        super_string += "<br>PC: 0x" + err_log[i].pos.toString(16).padStart(4, "0")
        super_string += "<br>Flags: Z: " + err_log[i].Flag.Z + "<br>_______N: " + err_log[i].Flag.N + "<br>_______H: " + err_log[i].Flag.H + "<br>_______C: " + err_log[i].Flag.C;
        super_string += "<br>A: 0x" + err_log[i].A.toString(16).padStart(2, "0");
        super_string += "<br>BC: 0x" + err_log[i].B.toString(16).padStart(2, "0") + err_log[i].C.toString(16).padStart(2, "0");
        super_string += "<br>DE: 0x" + err_log[i].D.toString(16).padStart(2, "0") + err_log[i].E.toString(16).padStart(2, "0");
        super_string += "<br>HL: 0x" + err_log[i].H.toString(16).padStart(2, "0") + err_log[i].L.toString(16).padStart(2, "0");
        super_string += "<br>Old: A: 0x" + err_log[i - 1].A.toString(16).padStart(2, "0");
        super_string += "<br>_____BC: 0x" + err_log[i - 1].B.toString(16).padStart(2, "0") + err_log[i - 1].C.toString(16).padStart(2, "0");
        super_string += "<br>_____DE: 0x" + err_log[i - 1].D.toString(16).padStart(2, "0") + err_log[i - 1].E.toString(16).padStart(2, "0");
        super_string += "<br>_____HL: 0x" + err_log[i - 1].H.toString(16).padStart(2, "0") + err_log[i - 1].L.toString(16).padStart(2, "0");
    }
    catch (err) {

    }
    try {
        super_string += "<br>Stack Pointer: 0x" + err_log[i].SP[0].toString(16).padStart(2, "0") + err_log[i].SP[1].toString(16).padStart(2, "0");
        super_string += "<br>Last Value: 0x" + err_log[i].instr.toString(16).padStart(2, "0");
        super_string += "<br>Last Instruction: " + last_instr;
        super_string += "<br>Arg1: 0x" + err_log[i].arg1.toString(16).padStart(2, "0");
        super_string += "_____Arg2: 0x" + err_log[i].arg2.toString(16).padStart(2, "0");
        super_string += "<br><br><br><br><br><br><br><br><br><br><br><br><br><br><br></p>";
    }
    catch (err) {

    }
    singledisp.innerHTML = super_string;
};

log_run.onclick = function () {
    show_debug_log();
    log_pos.value = log_pos.valueAsNumber + 1;
};
log_run_back.onclick = function () {
    log_pos.value = log_pos.valueAsNumber - 2;
    show_debug_log();
    log_pos.value = log_pos.valueAsNumber + 1;
};

function err_log_build(orgpos, instr, arg1, arg2) {
    err_log.push({ instr: instr, arg1: arg1, arg2: arg2, orgpos: orgpos, pos: pos, A: ram.A, B: ram.B, C: ram.C, D: ram.D, E: ram.E, H: ram.H, L: ram.L, Flag: { Z: ram.Flag.Z, N: ram.Flag.N, H: ram.Flag.H, C: ram.Flag.C }, SP: [ram.SP[0], ram.SP[1]]});
    if (err_log.length >= log_len) {
        err_log.shift();
    }
}

let key_change = false;
let p14 = 0;
let p15 = 0;
let keyr = 0;
let keyl = 0;
let keyu = 0;
let keyd = 0;
let keya = 0;
let keyb = 0;
let keyst = 0;
let keyse = 0;

let xff04 = 0;
let xff05 = 0;

let old_stat = 0;

let throw_vblank = 0;
let throw_lcdc = 0; //to do only once: 0 can be called, 1 is called, -1 just called
let throw_timer = 0;
let throw_pchange = 0;

function check_sus() {
    if (suspicious) {
        //Check RAM Activation
        if ( read(pos - 1, 0) !== 0x0a || read(pos - 2, 0) !== 0x36 || read(pos - 3, 0) !== 0x00 || read(pos - 4, 0) !== 0x00 || read(pos - 5, 0) !== 0x21) {
            cpu_abort = true;
            alert("RAM Activation does not match know patterns\n\n" + read(pos - 5, 0).toString(16) + "     " + read(pos - 4, 0).toString(16) + "     " + read(pos - 3, 0).toString(16) + "     " + read(pos - 2, 0).toString(16) + "     " + read(pos - 1, 0).toString(16)
            );
        } else {
            console.log("cleared");
        }
        suspicious = false;
    }
}


document.addEventListener("keydown", function (event) {
    if (event.key === keybindings[0]) {
        //left
        event.preventDefault();
        keyl = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[1]) {
        //down
        event.preventDefault();
        keyd = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[2]) {
        //right
        event.preventDefault();
        keyr = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[3]) {
        //up
        event.preventDefault();
        keyu = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[4]) {
        //B
        event.preventDefault();
        keyb = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[5]) {
        //A
        event.preventDefault();
        keya = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[6]) {
        //Start
        event.preventDefault();
        keyst = 1;
        key_change = true;
        stopped = false;
    } else if (event.key === keybindings[7]) {
        //Select
        event.preventDefault();
        keyse = 1;
        key_change = true;
        stopped = false;
    }
});
document.addEventListener("keyup", function (event) {
    if (event.key === keybindings[0]) {
        //left
        event.preventDefault();
        keyl = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[1]) {
        //down
        event.preventDefault();
        keyd = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[2]) {
        //right
        event.preventDefault();
        keyr = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[3]) {
        //up
        event.preventDefault();
        keyu = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[4]) {
        //B
        event.preventDefault();
        keyb = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[5]) {
        //A
        event.preventDefault();
        keya = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[6]) {
        //Start
        event.preventDefault();
        keyst = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    } else if (event.key === keybindings[7]) {
        //Select
        event.preventDefault();
        keyse = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    }
});

function gamepad_down(button_id) {
	let key = "J"+button_id.padStart(2, "0");
    if (key === keybindings[0]) {
        //left
        keyl = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[1]) {
        //down
        keyd = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[2]) {
        //right
        keyr = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[3]) {
        //up
        keyu = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[4]) {
        //B
        keyb = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[5]) {
        //A
        keya = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[6]) {
        //Start
        keyst = 1;
        key_change = true;
        stopped = false;
    } else if (key === keybindings[7]) {
        //Select
        keyse = 1;
        key_change = true;
        stopped = false;
    }
};
function gamepad_up(button_id) {
	let key = "J"+button_id.padStart(2, "0");
    if (key === keybindings[0]) {
        //left
        keyl = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[1]) {
        //down
        keyd = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[2]) {
        //right
        keyr = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[3]) {
        //up
        keyu = 0;
        key_change = true;
        if (p14 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[4]) {
        //B
        keyb = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[5]) {
        //A
        keya = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[6]) {
        //Start
        keyst = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    } else if (key === keybindings[7]) {
        //Select
        keyse = 0;
        key_change = true;
        if (p15 === 1) {
            throw_pchange = 1;
        }
    }
};
function poll_joysticks() {
	let events = get_gamepad_events();
	for (let ev of events) {
		if (ev.new_state === true) {
			gamepad_down(ev.button);
		}else {
			gamepad_up(ev.button);
		}
	}
};

function spc_reg(cyc) {
    //0xFF00 I/O Ports
    let xff00 = read(0xff00, 0);
    if ( (xff00 & 0b1_0000) >> 4 !== p14 || (xff00 & 0b10_0000) >> 5 !== p15 || key_change ) {
        p14 = xff00 & 0b1_0000;
        p15 = xff00 & 0b10_0000;
        if (p14 === 0) {
            //all are backwards 0=select/pressed
            let mask = 0;
            if (keyr === 0) {
                mask += 1;
            }
            if (keyl === 0) {
                mask += 0b10;
            }
            if (keyu === 0) {
                mask += 0b100;
            }
            if (keyd === 0) {
                mask += 0b1000;
            }
            xff00 &= 0b11_0000;
            xff00 |= mask;
        }
        if (p15 === 0) {
            let mask = 0;
            if (keya === 0) {
                mask += 1;
            }
            if (keyb === 0) {
                mask += 0b10;
            }
            if (keyse === 0) {
                mask += 0b100;
            }
            if (keyst === 0) {
                mask += 0b1000;
            }
            xff00 &= 0b11_0000;
            xff00 |= mask;
        }
        write(0xff00, xff00, 0);
    }
    //0xFF01 Serial IO data (ignored)
    //0xFF02 Serial IO control (ignored)
    //0xFF04 DIV timer
    if (read(0xff04, 0) === 0) {
        xff04 = 0;
    }
    xff04 += cyc * 0.397558594;
    if (xff04 >= 256) {
        xff04 -= 256;
    }
    write(0xff04, Math.floor(xff04), 0);
    //0xFF05 TIMA interrupt timer
    let xff07 = read(0xff07, 0);
    if ((xff07 & 0b100) >> 2 === 1) {
        switch (xff07 & 0b11) {
            case 0:
                xff05 += cyc;
                break;
            case 1:
                xff05 += cyc * 65.5;
                break;
            case 2:
                xff05 += cyc * 16.25;
                break;
            case 3:
                xff05 += cyc * 4;
                break;
            default:
                alert("The laws of magic are breaking down.");
        }
        if (xff05 >= 256) {
            xff05 -= 256 - read(0xff06, 0);
            throw_timer = 1;
        }
        write(0xff04, Math.floor(xff05), 0);
    }
    //0xFF06 TIMA timer reset value
    //0xFF07 TIMA timer settings
    //0xFF0F Interrupt Flag (set by interrupt_handle();)
    //0xFF10-0xFF3F Sound (ignored)
    //0xFF40 LCD Control (input)
    //0xFF41 LCD STAT
    let xff40 = read(0xff40, 0);
    let xff41 = read(0xff41, 0);
    let xff44 = Math.floor(cyc / 456);
    let mask = 0;
    //if ((xff40 & 0b1000_0000) >> 7 === 1) {
    if (xff44 >= 144 && xff44 <= 153) {
        //mode 01
        mask += 1;
        if (old_stat !== 1) {
            old_stat = 1;
            throw_vblank = 1;
        }
    } else {
        if (cyc % 456 < 80) {
            //mode 00
            if (old_stat !== 0) {
                old_stat = 0;
                if ((xff41 & 0b0000_1000) >> 3 === 1) {
                    throw_lcdc = 1;
                }
            }
        } else if (cyc % 456 < 252) {
            //mode 10
            mask += 2;
            if (old_stat !== 2) {
                old_stat = 2;
                if ((xff41 & 0b0001_0000) >> 4 === 1) {
                    throw_lcdc = 1;
                }
            }
        } else {
            //mode 11
            mask += 3;
            if (old_stat !== 3) {
                old_stat = 3;
                if ((xff41 & 0b0010_0000) >> 5 === 1) {
                    throw_lcdc = 1;
                }
            }
        }
    }
    if (xff44 === read(0xff45, 0) && (xff41 & 0b0100_0000) >> 6 === 1) {
        mask += 0b100;
        if (throw_lcdc === 0) {
            throw_lcdc = 1;
        }
    } else {
        throw_lcdc = 0;
    }
    xff41 &= 0b0111_1000;
    xff41 |= mask;
    write(0xff41, xff41, 0);
    //0xFF44 Scan line (Y)
    /*if ((xff40 & 0b1000_0000) >> 7 === 1) {
        write(0xFF44, xff44, 0);
    }else {*/
    write(0xff44, xff44, 0);
    //}
}

function interrupt_handle() {
    let xff0f = 0;
    let xffff = read(0xffff, 0);

    if (throw_vblank === 1) {
        xff0f += 1;
        throw_vblank = 0;
        if (interrupts && (xffff & 1) === 1) {
            stackpushb16(split_b16(pos));
            pos = 0x40;
            interrupts = false;
            write(0xff0f, xff0f, 0);
            // console.log("V-Blank Interrupt thrown");
            return;
        }
    }
    if (throw_lcdc === 1) {
        xff0f += 0b10;
        throw_lcdc = -1;
        if (interrupts && (xffff & 0b10) >> 1 === 1) {
            stackpushb16(split_b16(pos));
            pos = 0x48;
            write(0xff0f, xff0f, 0);
            // console.log("LCDC Scan Line Interrupt thrown");
            return;
        }
    }
    if (throw_timer === 1) {
        xff0f += 0b100;
        throw_timer = 0;
        if (interrupts && (xffff & 0b100) >> 2 === 1) {
            stackpushb16(split_b16(pos));
            pos = 0x50;
            write(0xff0f, xff0f, 0);
            // console.log("Timer Overflow Interrupt thrown");
            return;
        }
    }
    //throw serial transfer complete (ingored)
    if (throw_pchange === 1) {
        xff0f += 0b100;
        throw_pchange = 0;
        if (interrupts && (xffff & 0b1_0000) >> 4 === 1) {
            stackpushb16(split_b16(pos));
            pos = 0x60;
            write(0xff0f, xff0f, 0);
            // console.log("Key Input High-to-Low Interrupt thrown");
            return;
        }
    }

    write(0xff0f, xff0f, 0);
}

function disp_condition(orgpos) {
    let instr = read(orgpos, 0);
    let last_instr = "";
    if (instr !== 0xcb) {
        last_instr = instruct_array[instr];
    } else {
        last_instr = " (CB) " + cb_array[(read(orgpos + 1) & 0b1111_1000) >> 3];
    }
    let super_string = "";
    super_string += "<p>Old PC: 0x" + orgpos.toString(16).padStart(4, "0");
    super_string += "<br>PC: 0x" + pos.toString(16).padStart(4, "0");
    super_string += "<br>Flags: Z: " + ram.Flag.Z + "<br>_______N: " + ram.Flag.N + "<br>_______H: " + ram.Flag.H + "<br>_______C: " + ram.Flag.C + "<br>A: 0x";
    super_string += ram.A.toString(16).padStart(2, "0");
    super_string += "<br>BC: 0x" + ram.B.toString(16).padStart(2, "0") + ram.C.toString(16).padStart(2, "0");
    super_string += "<br>DE: 0x" + ram.D.toString(16).padStart(2, "0") + ram.E.toString(16).padStart(2, "0");
    super_string += "<br>HL: 0x" + ram.H.toString(16).padStart(2, "0") + ram.L.toString(16).padStart(2, "0");
    super_string += "<br>Old: A: 0x" + old_ram.A.toString(16).padStart(2, "0");
    super_string += "<br>_____BC: 0x" + old_ram.B.toString(16).padStart(2, "0") + old_ram.C.toString(16).padStart(2, "0");
    super_string += "<br>_____DE: 0x" + old_ram.D.toString(16).padStart(2, "0") + old_ram.E.toString(16).padStart(2, "0");
    super_string += "<br>_____HL: 0x" + old_ram.H.toString(16).padStart(2, "0") + old_ram.L.toString(16).padStart(2, "0");
    super_string += "<br>Stack Pointer: 0x" + ram.SP[0].toString(16).padStart(2, "0") + ram.SP[1].toString(16).padStart(2, "0");
    super_string += "<br>Last Value: 0x" + read(orgpos).toString(16).padStart(2, "0");
    super_string += "<br>Last Instruction: " + last_instr;
    super_string += "<br>Arg1: 0x" + read(orgpos + 1, 0).toString(16).padStart(2, "0");
    super_string += "_____Arg2: 0x" + read(orgpos + 2, 0).toString(16).padStart(2, "0");
    super_string += "<br>0xFF40 LCD Display: 0x" + read(0xff40, 0).toString(2).padStart(8, "0");
    super_string += "<br>0xFF41 LCD Status: 0x" + read(0xff41, 0).toString(2).padStart(8, "0");
    super_string += "<br>0xFF44 Scan Line: " + read(0xff44, 0);
    super_string += "<br>0xFF45 LYC Compare: " + read(0xff45, 0);
    super_string += "<br>0xFF0F Interrupts Thrown: 0x" + read(0xff0f, 0).toString(2).padStart(8, "0");
    super_string += "<br>0xFFFF Interrupt Enable: 0x" + read(0xffff, 0).toString(2).padStart(8, "0");
    super_string += "<br>Master Interrupt Enable Register: " + interrupts;
    super_string += "<br>Square Wave 1: 0xFF10 0x" + read(0xff10, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF11: 0x" + read(0xff11, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF12: 0x" + read(0xff12, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF13: 0x" + read(0xff13, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF14: 0x" + read(0xff14, 0).toString(2).padStart(8, "0");
    super_string += "<br>Square Wave 2: 0xFF15 0x" + read(0xff15, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF16: 0x" + read(0xff16, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF17: 0x" + read(0xff17, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF18: 0x" + read(0xff18, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF19: 0x" + read(0xff19, 0).toString(2).padStart(8, "0");
    super_string += "<br>Wave Table: 0xFF1A 0x" + read(0xff1a, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF1B: 0x" + read(0xff1b, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF1C: 0x" + read(0xff1c, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF1D: 0x" + read(0xff1d, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF1E: 0x" + read(0xff1e, 0).toString(2).padStart(8, "0");
    super_string += "<br>Noise Generator: 0xFF20: 0x" + read(0xff20, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF21: 0x" + read(0xff21, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF22: 0x" + read(0xff22, 0).toString(2).padStart(8, "0");
    super_string += "    0xFF23: 0x" + read(0xff23, 0).toString(2).padStart(8, "0")
    super_string += "<br><br><br></p>";
    singledisp.innerHTML = super_string;
    old_ram.A = ram.A;
    old_ram.B = ram.B;
    old_ram.C = ram.C;
    old_ram.D = ram.D;
    old_ram.E = ram.E;
    old_ram.H = ram.H;
    old_ram.L = ram.L;
}

function cpu_cycle(single) {
    if (!stopped) {
        single = single || false;
        let orgpos = pos;
        if (err_log_en) {
            var arg1 = read(pos + 1, 0);
            var arg2 = read(pos + 2, 0);
        }
        let instr = get_byte(true);
        if (cpu_dump_intstr === 1) {
            console.log(pos.toString(16) + ": " + instr.toString(16));
        }
        if (dis_unimp_opcode === 0) {
            instruct_array[instr]();
        } else {
            try {
                instruct_array[instr]();
            } catch (err) {
                alert(pos.toString(16));
                alert("Unimplemented opc-code: " + instr.toString(16));
                alert(instruct_array[instr]);
                break_loop = true;
                return;
            }
        }
        if (err_log_en) {
            err_log_build(orgpos, instr, arg1, arg2);
        }

        if (single) {
            disp_condition(orgpos);
            spc_reg(cycles);
            interrupt_handle();
            if (dma === 1) {
                cycles += 160;
                dma = 0;
            }

            if (cycles > 70224) {
                cycles -= 70224;
                frames += 1;
            }

            draw(XFF00, read);
        }
    } else {
        alert("Waiting for key press...");
    }
}

function run_handler() {
    timing_handler();
}

function check_registers() {
    if (ram.A === undefined) {
        alert("ram.A is undefined");
        cpu_abort = true;
    }
    if (ram.B === undefined) {
        alert("ram.B is undefined");
        cpu_abort = true;
    }
    if (ram.C === undefined) {
        alert("ram.C is undefined");
        cpu_abort = true;
    }
    if (ram.D === undefined) {
        alert("ram.D is undefined");
        cpu_abort = true;
    }
    if (ram.E === undefined) {
        alert("ram.E is undefined");
        cpu_abort = true;
    }
    if (ram.H === undefined) {
        alert("ram.H is undefined");
        cpu_abort = true;
    }
    if (ram.L === undefined) {
        alert("ram.L is undefined");
        cpu_abort = true;
    }
};

function check_cpu_pointer() {
    if (run_boot_rom && in_boot_rom && pos > 0x100) {
        alert("PC out of boot ROM before execution complete");
        cpu_abort = true;
    }
    // if ((pos >= 0x8000 && pos < 0xC000) || (pos >= 0xE000 && pos < 0xff80)) {
    //     alert("PC in peculiar place: "+pos.toString(16));
    //     cpu_abort = true;
    // }
};

let snd_store_cycles = 0;
function timing_handler(cyc_run) {
    if (!stopped) {
        cyc_run = cyc_run || 0;

        //cpu_timestamp = new Date();
        //console.log(cpu_timestamp.getTime());
        
        if (cyc_run === 0) {
            // Safety in case we get off somehow
            reset_screen_drawing();
            // Overflow from last screen drawn now
            draw_dots(cycles, XFF00, read);
            while (cycles < 70224) {
                let old_cycles = cycles;
                cpu_cycle();

                spc_reg(cycles);
                interrupt_handle();
                if (interrupts_delayed_true) {
                    interrupts = true;
                    interrupts_delayed_true = false;
                }
                draw_dots(cycles-old_cycles, XFF00, read);
                if (dma === 1) {
                    cycles += 160;
                    dma = 0;
                }
                snd_store_cycles += cycles-old_cycles;
                if (snd_store_cycles > 1024 && sound_enabled) {
                    XFF00 = channel_clocker(1024, XFF00);
                    snd_store_cycles -= 1024;
                }
                if (cycles > sound_timer && sound_enabled) {
                    sound_timer += 8192;
                    XFF00 = frame_sequencer(XFF00);
                }
                if (stopped) {
                    return;
                }
                if (/*snd_suspicious || */scr_suspicious || cb_suspicious || mem_suspicious || cpu_suspicious ) {
                    check_sus();
                }
                if (cpu_abort/* || snd_abort*/ || cb_abort || mem_abort || scr_abort) {
                    if (cpu_abort) {
                        alert("CPU Abort");
                        cpu_abort = false;
                    }
                    /*if (snd_abort) {
                        alert("Sound Abort");
                        cpu_abort = false;
                    }*/
                    if (scr_abort) {
                        alert("Screen Abort");
                        cpu_abort = false;
                    }
                    if (cb_abort) {
                        alert("CB Abort");
                        cpu_abort = false;
                    }
                    if (mem_abort) {
                        alert("Memory Abort");
                        cpu_abort = false;
                    }
                    endLoop();
                    return;
                }
                if (stoprightnow) {
                    stoprightnow = false;
                    endLoop();
                    return;
                }
                nop_counter = Math.max(nop_counter-1, 0);
                check_registers();
                check_cpu_pointer();
            }
            cycles -= 70224;
            sound_timer -= 70224;
            frames += 1;
            poll_joysticks();
            /*if (!quit) {
                setTimeout(timing_handler);
            }*/
        } else {
            if (cyc_run === 456) {
                let orgpos = pos;
                let ffs = -1;
                while (ffs < cycles % 456) {
                    ffs = cycles % 456;
                    orgpos = pos;
                    cpu_cycle();
                    spc_reg(cycles);
                    interrupt_handle();
                    if (dma === 1) {
                        cycles += 160;
                        dma = 0;
                    }
                    if (cycles > 70224) {
                        cycles -= 70224;
                        cyc_run -= 70224;
                        frames += 1;
                    }
                }
                disp_condition(orgpos);
            } else {
                let orgpos = 0;
                cyc_run += cycles;
                while (cycles < cyc_run) {
                    orgpos = pos;
                    cpu_cycle();
                    spc_reg(cycles);
                    interrupt_handle();
                    if (dma === 1) {
                        cycles += 160;
                        dma = 0;
                    }
                    if (cycles > 70224) {
                        cycles -= 70224;
                        cyc_run -= 70224;
                        frames += 1;
                    }
                }
                disp_condition(orgpos);
            }
        }

        //draw(XFF00, read);

        //cpu_timestamp = new Date();
        //console.log(/*cpu_timestamp.getTime() + */" : frame " + frames);
    } else {
        console.log("Waiting for key press...");
    }
}

let loop = undefined;

function beginLoop() {
    quit = false;
    loop = setInterval(run_handler, 0);
}
function endLoop() {
    clearInterval(loop);
    quit = true;
    stop_all_sound();
}

let zed = 0;
function read_unpack(unpack) {
    let ret = unpack[zed];
    zed++;
    return ret;
}

function unpack_state(unpack) {
    let ret = read_unpack(unpack);
    ram.Flag.Z = Boolean((ret & 0b1000_0000) >> 7 === 1);
    ram.Flag.N = Boolean((ret & 0b0100_0000) >> 6 === 1);
    ram.Flag.H = Boolean((ret & 0b0010_0000) >> 5 === 1);
    ram.Flag.C = Boolean((ret & 0b0001_0000) >> 4 === 1);
    ram.A = read_unpack(unpack);
    ram.B = read_unpack(unpack);
    ram.C = read_unpack(unpack);
    ram.D = read_unpack(unpack);
    ram.E = read_unpack(unpack);
    ram.H = read_unpack(unpack);
    ram.L = read_unpack(unpack);
    ram.SP[0] = read_unpack(unpack);
    ram.SP[1] = read_unpack(unpack);
    let poslow = read_unpack(unpack);
    let poshigh = read_unpack(unpack);
    pos = poslow + poshigh * 0b1_0000_0000;
    /*alert(poslow);
    alert(poshigh);
    alert(poslow + poshigh * 0b1_0000_0000);
    alert(pos);*/
    load_state(unpack, z);
    alert("Save State Loaded");
}

function cpu_reset() {
    if (run_boot_rom) {
        in_boot_rom = true;
        pos = 0x00;
    }else {
        pos = 0x100;
    }
};

/*ram.A = 0xFF;
ram.E = 0x92;
ram.Flag.C = false;

run0x8B();

alert(ram.A.toString(16));*/
