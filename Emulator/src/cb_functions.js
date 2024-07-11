let dump_instr = 0;
let cb_abort = false;
let cb_suspicious = false;

let no_debug = false;


let frames = 0;
let cycles = 0;

//Complete: 0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F

let Flag = { Z: false, N: false, H: false, C: false };

function run0x0_A(num) {
    //RLC
    if ((num & 0b1000_0000) >> 7 === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    let drop = num & 0b1000_0000;
    drop = drop >> 7;
    num = num << 1;
    num += drop;
    num = num & 0b1111_1111;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x0# (A) RLC");
    }
    return num;
}
function run0x0_B(num) {
    //RRC
    if ((num & 0b0000_0001) === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    let drop = num & 0b0000_0001;
    drop = drop << 7;
    num = num >> 1;
    num += drop;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x0# (B) RRC");
    }
    return num;
}
function run0x1_A(num) {
    //RL
    let car = 0;
    if (Flag.C) {
        car = 1;
    }
    if ((num & 0b1000_0000) >> 7 === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    num = num << 1;
    num += car;
    num = num & 0b1111_1111;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x1# (A) RL");
    }
    return num;
}
function run0x1_B(num) {
    //RR
    let car = 0;
    if (Flag.C) {
        car = 1;
    }
    if ((num & 0b0000_0001) === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    num = num >> 1;
    num += car << 7;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x1# (B) RR");
    }
    return num;
}
function run0x2_A(num) {
    //SLA
    if ((num & 0b1000_0000) >> 7 === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    num = num << 1;
    num = num & 0b1111_1111;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x2# (A) SLA");
    }
    return num;
}
function run0x2_B(num) {
    //SRA
    let msb = num & 0b1000_0000;
    if ((num & 0b0000_0001) === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    num = num >> 1;
    num += msb;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x2# (B) SRA");
    }
    return num;
}
function run0x3_A(num) {
    //SWAP
    let high = num & 0b1111_0000;
    num = num & 0b0000_1111;
    num = num << 4;
    high = high >> 4;
    num += high;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    Flag.C = false;
    if (dump_instr === 1) {
        console.log("0x3# (A) SWAP");
    }
    return num;
}
function run0x3_B(num) {
    //SRL
    if ((num & 0b0000_0001) === 1) {
        Flag.C = true;
    } else {
        Flag.C = false;
    }
    num = num >> 1;
    if (num === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = false;
    if (dump_instr === 1) {
        console.log("0x3# (B) SRL");
    }
    return num;
}
function run0x4_A(num) {
    //BIT 0
    if ((num & 0b0000_0001) === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x4# (A) BIT 0");
    }
    return num;
}
function run0x4_B(num) {
    //BIT 1
    if ((num & 0b0000_0010) >> 1 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x4# (B) BIT 1");
    }
    return num;
}
function run0x5_A(num) {
    //BIT 2
    if ((num & 0b0000_0100) >> 2 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x5# (A) BIT 2");
    }
    return num;
}
function run0x5_B(num) {
    //BIT 3
    if ((num & 0b0000_1000) >> 3 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x5# (B) BIT 3");
    }
    return num;
}
function run0x6_A(num) {
    //BIT 4
    if ((num & 0b00001_0000) >> 4 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x6# (A) BIT 4");
    }
    return num;
}
function run0x6_B(num) {
    //BIT 5
    if ((num & 0b0010_0000) >> 5 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x6# (B) BIT 5");
    }
    return num;
}
function run0x7_A(num) {
    //BIT 6
    if ((num & 0b0100_0000) >> 6 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x7# (A) BIT 6");
    }
    return num;
}
function run0x7_B(num) {
    //BIT 7
    if ((num & 0b1000_0000) >> 7 === 0) {
        Flag.Z = true;
    } else {
        Flag.Z = false;
    }
    Flag.N = false;
    Flag.H = true;
    if (dump_instr === 1) {
        console.log("0x7# (B) BIT 7");
    }
    return num;
}
function run0x8_A(num) {
    //RES 0
    num = num & 0b1111_1110;
    if (dump_instr === 1) {
        console.log("0x8# (A) RES 0");
    }
    return num;
}
function run0x8_B(num) {
    //RES 1
    num = num & 0b1111_1101;
    if (dump_instr === 1) {
        console.log("0x8# (B) RES 1");
    }
    return num;
}
function run0x9_A(num) {
    //RES 2
    num = num & 0b1111_1011;
    if (dump_instr === 1) {
        console.log("0x9# (A) RES 2");
    }
    return num;
}
function run0x9_B(num) {
    //RES 3
    num = num & 0b1111_0111;
    if (dump_instr === 1) {
        console.log("0x9# (B) RES 3");
    }
    return num;
}
function run0xA_A(num) {
    //RES 4
    num = num & 0b1110_1111;
    if (dump_instr === 1) {
        console.log("0xA# (A) RES 4");
    }
    return num;
}
function run0xA_B(num) {
    //RES 5
    num = num & 0b1101_1111;
    if (dump_instr === 1) {
        console.log("0xA# (B) RES 5");
    }
    return num;
}
function run0xB_A(num) {
    //RES 6
    num = num & 0b1011_1111;
    if (dump_instr === 1) {
        console.log("0xB# (A) RES 6");
    }
    return num;
}
function run0xB_B(num) {
    //RES 7
    num = num & 0b0111_1111;
    if (dump_instr === 1) {
        console.log("0xB# (B) RES 7");
    }
    return num;
}
function run0xC_A(num) {
    //SET 0
    num = num | 0b0000_0001;
    if (dump_instr === 1) {
        console.log("0xC# (A) SET 0");
    }
    return num;
}
function run0xC_B(num) {
    //SET 1
    num = num | 0b0000_0010;
    if (dump_instr === 1) {
        console.log("0xC# (B) SET 1");
    }
    return num;
}
function run0xD_A(num) {
    //SET 2
    num = num | 0b0000_0100;
    if (dump_instr === 1) {
        console.log("0xD# (A) SET 2");
    }
    return num;
}
function run0xD_B(num) {
    //SET 3
    num = num | 0b0000_1000;
    if (dump_instr === 1) {
        console.log("0xD# (B) SET 3");
    }
    return num;
}
function run0xE_A(num) {
    //SET 4
    num = num | 0b0001_0000;
    if (dump_instr === 1) {
        console.log("0xE# (A) SET 4");
    }
    return num;
}
function run0xE_B(num) {
    //SET 5
    num = num | 0b0010_0000;
    if (dump_instr === 1) {
        console.log("0xE# (B) SET 5");
    }
    return num;
}
function run0xF_A(num) {
    //SET 6
    num = num | 0b0100_0000;
    if (dump_instr === 1) {
        console.log("0xF# (A) SET 6");
    }
    return num;
}
function run0xF_B(num) {
    //SET 7
    num = num | 0b1000_0000;
    if (dump_instr === 1) {
        console.log("0xF# (B) SET 7");
    }
    return num;
}

/*let cb_array = [
    run0x0_A,
    run0x0_A,
    run0x0_A,
    run0x0_A,
    run0x0_A,
    run0x0_A,
    run0x0_A,
    run0x0_A,
    run0x0_B,
    run0x0_B,
    run0x0_B,
    run0x0_B,
    run0x0_B,
    run0x0_B,
    run0x0_B,
    run0x0_B,
    run0x1_A,
    run0x1_A,
    run0x1_A,
    run0x1_A,
    run0x1_A,
    run0x1_A,
    run0x1_A,
    run0x1_A,
    run0x1_B,
    run0x1_B,
    run0x1_B,
    run0x1_B,
    run0x1_B,
    run0x1_B,
    run0x1_B,
    run0x1_B,
    run0x2_A,
    run0x2_A,
    run0x2_A,
    run0x2_A,
    run0x2_A,
    run0x2_A,
    run0x2_A,
    run0x2_A,
    run0x2_B,
    run0x2_B,
    run0x2_B,
    run0x2_B,
    run0x2_B,
    run0x2_B,
    run0x2_B,
    run0x2_B,
    run0x3_A,
    run0x3_A,
    run0x3_A,
    run0x3_A,
    run0x3_A,
    run0x3_A,
    run0x3_A,
    run0x3_A,
    run0x3_B,
    run0x3_B,
    run0x3_B,
    run0x3_B,
    run0x3_B,
    run0x3_B,
    run0x3_B,
    run0x3_B,
    run0x4_A,
    run0x4_A,
    run0x4_A,
    run0x4_A,
    run0x4_A,
    run0x4_A,
    run0x4_A,
    run0x4_A,
    run0x4_B,
    run0x4_B,
    run0x4_B,
    run0x4_B,
    run0x4_B,
    run0x4_B,
    run0x4_B,
    run0x4_B,
    run0x5_A,
    run0x5_A,
    run0x5_A,
    run0x5_A,
    run0x5_A,
    run0x5_A,
    run0x5_A,
    run0x5_A,
    run0x5_B,
    run0x5_B,
    run0x5_B,
    run0x5_B,
    run0x5_B,
    run0x5_B,
    run0x5_B,
    run0x5_B,
    run0x6_A,
    run0x6_A,
    run0x6_A,
    run0x6_A,
    run0x6_A,
    run0x6_A,
    run0x6_A,
    run0x6_A,
    run0x6_B,
    run0x6_B,
    run0x6_B,
    run0x6_B,
    run0x6_B,
    run0x6_B,
    run0x6_B,
    run0x6_B,
    run0x7_A,
    run0x7_A,
    run0x7_A,
    run0x7_A,
    run0x7_A,
    run0x7_A,
    run0x7_A,
    run0x7_A,
    run0x7_B,
    run0x7_B,
    run0x7_B,
    run0x7_B,
    run0x7_B,
    run0x7_B,
    run0x7_B,
    run0x7_B,
    run0x8_A,
    run0x8_A,
    run0x8_A,
    run0x8_A,
    run0x8_A,
    run0x8_A,
    run0x8_A,
    run0x8_A,
    run0x8_B,
    run0x8_B,
    run0x8_B,
    run0x8_B,
    run0x8_B,
    run0x8_B,
    run0x8_B,
    run0x8_B,
    run0x9_A,
    run0x9_A,
    run0x9_A,
    run0x9_A,
    run0x9_A,
    run0x9_A,
    run0x9_A,
    run0x9_A,
    run0x9_B,
    run0x9_B,
    run0x9_B,
    run0x9_B,
    run0x9_B,
    run0x9_B,
    run0x9_B,
    run0x9_B,
    run0xA_A,
    run0xA_A,
    run0xA_A,
    run0xA_A,
    run0xA_A,
    run0xA_A,
    run0xA_A,
    run0xA_A,
    run0xA_B,
    run0xA_B,
    run0xA_B,
    run0xA_B,
    run0xA_B,
    run0xA_B,
    run0xA_B,
    run0xA_B,
    run0xB_A,
    run0xB_A,
    run0xB_A,
    run0xB_A,
    run0xB_A,
    run0xB_A,
    run0xB_A,
    run0xB_A,
    run0xB_B,
    run0xB_B,
    run0xB_B,
    run0xB_B,
    run0xB_B,
    run0xB_B,
    run0xB_B,
    run0xB_B,
    run0xC_A,
    run0xC_A,
    run0xC_A,
    run0xC_A,
    run0xC_A,
    run0xC_A,
    run0xC_A,
    run0xC_A,
    run0xC_B,
    run0xC_B,
    run0xC_B,
    run0xC_B,
    run0xC_B,
    run0xC_B,
    run0xC_B,
    run0xC_B,
    run0xD_A,
    run0xD_A,
    run0xD_A,
    run0xD_A,
    run0xD_A,
    run0xD_A,
    run0xD_A,
    run0xD_A,
    run0xD_B,
    run0xD_B,
    run0xD_B,
    run0xD_B,
    run0xD_B,
    run0xD_B,
    run0xD_B,
    run0xD_B,
    run0xE_A,
    run0xE_A,
    run0xE_A,
    run0xE_A,
    run0xE_A,
    run0xE_A,
    run0xE_A,
    run0xE_A,
    run0xE_B,
    run0xE_B,
    run0xE_B,
    run0xE_B,
    run0xE_B,
    run0xE_B,
    run0xE_B,
    run0xE_B,
    run0xF_A,
    run0xF_A,
    run0xF_A,
    run0xF_A,
    run0xF_A,
    run0xF_A,
    run0xF_A,
    run0xF_A,
    run0xF_B,
    run0xF_B,
    run0xF_B,
    run0xF_B,
    run0xF_B,
    run0xF_B,
    run0xF_B,
    run0xF_B
];*/

let cb_array = [
    run0x0_A,
    run0x0_B,
    run0x1_A,
    run0x1_B,
    run0x2_A,
    run0x2_B,
    run0x3_A,
    run0x3_B,
    run0x4_A,
    run0x4_B,
    run0x5_A,
    run0x5_B,
    run0x6_A,
    run0x6_B,
    run0x7_A,
    run0x7_B,
    run0x8_A,
    run0x8_B,
    run0x9_A,
    run0x9_B,
    run0xA_A,
    run0xA_B,
    run0xB_A,
    run0xB_B,
    run0xC_A,
    run0xC_B,
    run0xD_A,
    run0xD_B,
    run0xE_A,
    run0xE_B,
    run0xF_A,
    run0xF_B
];

/*function testArray() {
    let i = 0;
    let j = 8;

    while (i < j) {
        if (cb_array[i] !== run0x0_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 0_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x0_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 0_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x1_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 1_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x1_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 1_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x2_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 2_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x2_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 2_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x3_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 3_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x3_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 3_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x4_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 4_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x4_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 4_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x5_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 5_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x5_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 5_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x6_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 6_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x6_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 6_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x7_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 7_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x7_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 7_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x8_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 8_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x8_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 8_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x9_A) {
            alert("cb_array error at " + i.toString(16) + ", is not 9_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0x9_B) {
            alert("cb_array error at " + i.toString(16) + ", is not 9_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xA_A) {
            alert("cb_array error at " + i.toString(16) + ", is not A_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xA_B) {
            alert("cb_array error at " + i.toString(16) + ", is not A_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xB_A) {
            alert("cb_array error at " + i.toString(16) + ", is not B_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xB_B) {
            alert("cb_array error at " + i.toString(16) + ", is not B_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xC_A) {
            alert("cb_array error at " + i.toString(16) + ", is not C_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xC_B) {
            alert("cb_array error at " + i.toString(16) + ", is not C_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xD_A) {
            alert("cb_array error at " + i.toString(16) + ", is not D_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xD_B) {
            alert("cb_array error at " + i.toString(16) + ", is not D_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xE_A) {
            alert("cb_array error at " + i.toString(16) + ", is not E_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xE_B) {
            alert("cb_array error at " + i.toString(16) + ", is not E_B");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xF_A) {
            alert("cb_array error at " + i.toString(16) + ", is not F_A");
        }
        i++;
    }
    j += 8;
    while (i < j) {
        if (cb_array[i] !== run0xF_B) {
            alert("cb_array error at " + i.toString(16) + ", is not F_B");
        }
        i++;
    }
    alert("cb test run");
}*/

//testArray();
