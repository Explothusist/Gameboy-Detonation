//import Tone from "tone";
//import * as s from "./snd_module.js";

// Tone.context.resume();

let sound = document.getElementById("sound");
let audio_context = new AudioContext();
const audio_worklet = audio_context.audioWorklet;
let testNode = undefined;

sound.onclick = function () {
    console.log("2");
    audio_context.resume().then(() => {
        console.log("3");
        //audioContext.audioWorklet.addModule("./snd_module.js");
        audio_worklet.addModule("./snd_module.js").then(() => {
            //audioContext = new AudioContext();
            console.log("4");
            const testNode = new AudioWorkletNode(audio_context, "snd-module");
            console.log("5");
            testNode.connect(audio_context.destination);
            console.log("6");
            console.log("Sound system loaded successfully");
            sound.outerHTML = "<button id='sound' disabled>Sound Ready</button>";
        });
    });
};

/*let go = 0;
while (go !== -1) {
    try {
        let test = new AudioWorkletNode(audioContext, "snd-module");
        go = -1;
    } catch (err) {
        go += 1;
        if (go > 1000) {
            go = -1;
        }
        console.log("...");
        console.log("err");
    }
}*/

/*function init() {
}
setTimeout(init, 10000);*/

//Figure out decibels: 20 to 50 range maybe?
//Use white noise functions or the psuedo-random system the gameboy used?

const dump_instr = 1;
let snd_abort = false;
let snd_suspicious = false;

let frame_seq = 0;
let seconds = 0;

let sw1 = undefined;
let sw2 = undefined;
let sw1_sweep = 0;

//const synth = new Tone.PolySynth().toDestination();
//synth.set({ detune: -1200 });
//synth.triggerAttackRelease(["C4", "E4", "A4"], 1);

let wt = undefined;
let wt_loc;
let ng = undefined;
let mixer1 = undefined;
let mixer2 = undefined;
let master_mixer = undefined;
let poly = undefined;
let lfsr_val = 0b111_1111_1111_1111;
/*master_mixer = new Tone.Merge().toMaster();
mixer1 = new Tone.Merge().connect(master_mixer, 0, 1);
mixer2 = new Tone.Merge().connect(master_mixer, 0, 0);
sw1 = new Tone.Synth();
sw2 = new Tone.Synth();
wt = new Tone.Synth();
ng = new Tone.Noise("white").start();
ng.stop();*/

/*sw1.connect(mixer1, 0, 0); //.start();
sw2.connect(mixer2, 0, 1); //.start();
wt.connect(mixer2, 0, 0); //.start();
ng.connect(mixer1, 0, 1); //.start();*/
/*const env = new Tone.Envelope({
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 0
});*/

/*master_mixer = new Tone.Merge().toMaster();
poly = new Tone.PolySynth();
//poly.envelope = env;
poly.set({
    envelope: {
        attack: 0.000001,
        decay: 0.000001,
        release: 0.000001
    }
});
poly.volume.value = 20;
ng = new Tone.Noise("white").start();
ng.stop();

poly.connect(master_mixer, 0, 1);
ng.connect(master_mixer, 0, 0);*/

master_mixer = new Tone.Channel().toMaster();
sw1 = new Tone.Synth();
sw2 = new Tone.Synth();
wt = new Tone.Synth();
ng = new Tone.Noise("white").start();
ng.stop();

sw1.connect(master_mixer, 0, 0); //.start();
sw2.connect(master_mixer, 0, 0); //.start();
wt.connect(master_mixer, 0, 0); //.start();
ng.connect(master_mixer, 0, 0); //.start();

let sw1_old = [0, 0, 0, 0]; // freq, vol, duty, enable
let sw2_old = [0, 0, 0, 0];
let wt_old = [0, 0, 0, 0];
let ng_old = [0, 0, 0, 0];

function sweep(XFF) {
    //Square Wave 1
    let sweep_period = (XFF[0x10] & 0b111_0000) >> 4;
    if ((XFF[0x14] & 0b1000_0000) >> 7 === 1 && sweep_period !== 0) {
        sw1_sweep -= 1;
        if (sw1_sweep <= 0) {
            if (dump_instr === 1) {
                console.log("Sweep Triggered");
            }
            sw1_sweep = sweep_period;
            let sweep_shift = XFF[0x10] & 0b111;
            let freq = XFF[0x13] + ((XFF[0x14] & 0b111) << 8);
            if (sweep_period === 0 || sweep_shift === 0) {
                XFF[0x14] &= 0b0111_1111;
                if (dump_instr === 1) {
                    console.log("SqWv1 Disabled: Sweep");
                }
            }
            if (sweep_shift !== 0) {
                let shadow_freq = freq >> sweep_shift;
                if ((XFF[0x10] & 0b1000) >> 3 === 1) {
                    shadow_freq *= -1;
                }
                freq += shadow_freq;
                if (freq > 2047) {
                    XFF[0x14] &= 0b0111_1111;
                } else {
                    XFF[0x13] = freq & 0b1111_1111;
                    XFF[0x14] &= 0b1111_1000;
                    XFF[0x14] |= (freq & 0b111_0000_0000) >> 8;
                }
                if (dump_instr === 1) {
                    console.log("Shift Successful");
                }
            }
        }
    }

    return XFF;
}

function length_counter(XFF) {
    //Square Wave 1
    if ((XFF[0x14] & 0b1000_0000) >> 7 === 1 &&(XFF[0x14] & 0b0100_0000) >> 6 === 1) {
        let length = XFF[0x11] & 0b11_1111;
        length -= 1;
        /*if (dump_instr === 1) {
            console.log("SqWv1 Length counter triggered: length " + length);
        }*/
        if (length <= 0) {
            XFF[0x14] &= 0b0111_1111;
            if (dump_instr === 1) {
                console.log("SqWv1 Length counter triggered shut off");
            }
        }
        XFF[0x11] &= 0b1100_0000;
        XFF[0x11] |= length;
    }
    //Square Wave 2
    if ((XFF[0x19] & 0b1000_0000) >> 7 === 1 &&(XFF[0x19] & 0b0100_0000) >> 6 === 1) {
        let length = XFF[0x16] & 0b11_1111;
        length -= 1;
        /*if (dump_instr === 1) {
            console.log("SqWv2 Length counter triggered: length " + length);
        }*/
        if (length <= 0) {
            XFF[0x19] &= 0b0111_1111;
            if (dump_instr === 1) {
                console.log("SqWv2 Length counter triggered shut off " + length);
            }
        }
        XFF[0x16] &= 0b1100_0000;
        XFF[0x16] |= length;
    }
    //Wave Table
    if ( (XFF[0x1e] & 0b1000_0000) >> 7 === 1 && (XFF[0x1e] & 0b0100_0000) >> 6 === 1 ) {
        let length = XFF[0x1b];
        length -= 1;
        /*if (dump_instr === 1) {
            console.log("WvTbl Length counter triggered: length " + length);
        }*/
        if (length <= 0) {
            XFF[0x1e] &= 0b0111_1111;
            if (dump_instr === 1) {
                console.log("WvTbl Length counter triggered shut off " + length);
            }
        }
        XFF[0x1b] = length;
    }
    //Noise Generator
    if ( (XFF[0x23] & 0b1000_0000) >> 7 === 1 && (XFF[0x23] & 0b0100_0000) >> 6 === 1 ) {
        let length = XFF[0x20] & 0b11_1111;
        length -= 1;
        if (dump_instr === 1) {
            console.log("NsGen Length counter triggered: length " + length);
        }
        if (length <= 0) {
            XFF[0x23] &= 0b0111_1111;
            if (dump_instr === 1) {
                console.log("NsGen Length counter triggered shut off " + length);
            }
        }
        XFF[0x20] &= 0b1100_0000;
        XFF[0x20] |= length;
    }

    return XFF;
}

function lfsr(XFF) {
    //Noise Generator
    if ((XFF[0x23] & 0b1000_0000) >> 7 === 1) {
        if (ng_old.enable === 0) {
            lfsr_val = 0b111_1111_1111_1111;
        }
        let high_bit = (lfsr_val & 0b1) ^ ((lfsr_val & 0b10) >> 1);
        lfsr_val = lfsr_val >> 1;
        if ((XFF[0x22] & 0b1000) >> 3 === 0) {
            lfsr_val &= 0b011_1111_1111_1111;
            lfsr_val += high_bit << 14;
        } else {
            lfsr_val &= 0b011_1111_1011_1111;
            lfsr_val += high_bit << 6;
            lfsr_val += high_bit << 14;
        }
    }

    return XFF;
}

// function play_channels(XFF) {
//     let change = 0;
//     //Square Wave 1
//     let freq = XFF[0x13] + ((XFF[0x14] & 0b111) << 8);
//     let duty = (XFF[0x11] & 0b1100_0000) >> 6;
//     let vol = (XFF[0x12] & 0b1111_0000) >> 4;
//     if ((XFF[0x14] & 0b1000_0000) >> 7 === 1 && freq !== 0) {
//         alert("BEEEP! 1");
//         snd_abort = true;
//         let sw1_new = [freq, vol, duty, 1];
//         if ( sw1_new[0] !== sw1_old[0] || sw1_new[1] !== sw1_old[1] || sw1_new[2] !== sw1_old[2] || sw1_new[3] !== sw1_old[3] ) {
//             /*let old_freq = sw1_old[0];
//             old_freq = 131072 / (2048 - old_freq);
//             poly.triggerRelease(old_freq);*/
//             change = 1;
//             sw1_old = sw1_new;
//             freq = 131072 / (2048 - freq);
//             switch (duty) {
//                 case 0:
//                     duty = 0.125;
//                     break;
//                 case 1:
//                     duty = 0.25;
//                     break;
//                 case 2:
//                     duty = 0.5;
//                     break;
//                 case 3:
//                     duty = 0.75;
//                     break;
//                 default:
//                     alert("Something is up. Do your duty correctly!");
//             }
//             vol = 20 + vol * (30 / 16);
//             //vol = 1 + (1 / 16) * vol;
//             sw1.triggerAttack(freq);
//             sw1.volume.value = vol;
//             //poly.triggerAttack(freq, Tone.now(), vol);
//             if (dump_instr === 1) {
//                 console.log("SqWv1 Noise made: freq " + freq);
//             }
//         }
//     } else {
//         if (sw1_old[3] === 1) {
//             change = 1;
//             freq = sw1_old[0];
//             freq = 131072 / (2048 - freq);
//             //poly.triggerRelease(freq);
//             sw1.triggerRelease();
//             sw1.volume.value = 0;
//             sw1_old[3] = 0;
//             if (dump_instr === 1) {
//                 console.log("SqWv1 Noise stopped");
//             }
//         }
//     }
//     //Square Wave 2
//     freq = XFF[0x18] + ((XFF[0x19] & 0b111) << 8);
//     if ((XFF[0x19] & 0b1000_0000) >> 7 === 1 && freq !== 0) {
//         alert("BEEEP! 2");
//          snd_abort = true;
//         let duty = (XFF[0x16] & 0b1100_0000) >> 6;
//         let vol = (XFF[0x17] & 0b1111_0000) >> 4;
//         let sw2_new = [freq, vol, duty, 1];
//         if ( sw2_new[0] !== sw2_old[0] || sw2_new[1] !== sw2_old[1] || sw2_new[2] !== sw2_old[2] || sw2_new[3] !== sw2_old[3] ) {
//             /*let old_freq = sw2_old[0];
//             old_freq = 131072 / (2048 - old_freq);
//             poly.triggerRelease(old_freq);*/
//             change = 1;
//             sw2_old = sw2_new;
//             freq = 131072 / (2048 - freq);
//             vol = 20 + vol * (30 / 16);
//             //vol = 1 + (1 / 16) * vol;
//             //sw2 = new Tone.PulseOscillator(freq, duty);
//             sw2.triggerAttack(freq);
//             sw2.volume.value = vol;
//             //poly.triggerAttack(freq, Tone.now(), vol);
//             if (dump_instr === 1) {
//                 console.log("SqWv2 Noise made: freq " + freq);
//             }
//         }
//     } else {
//         if (sw2_old[3] === 1) {
//             change = 1;
//             freq = sw2_old[0];
//             freq = 131072 / (2048 - freq);
//             sw2.triggerRelease();
//             sw2.volume.value = 0;
//             //poly.triggerRelease(freq);
//             sw2_old[3] = 0;
//             if (dump_instr === 1) {
//                 console.log("SqWv2 Noise stopped");
//             }
//         }
//     }
//     //Wave Table
//     freq = XFF[0x1d] + ((XFF[0x14] & 0b111) << 8);
//     vol = (XFF[0x1c] & 0b0110_0000) >> 5;
//     if ((XFF[0x1e] & 0b1000_0000) >> 7 === 1 && freq !== 0) {
//         alert("BEEEP! T");
//          snd_abort = true;
//         let wt_new = [freq, vol, undefined, 1];
//         if ( wt_new[0] !== wt_old[0] || wt_new[1] !== wt_old[1] || wt_new[3] !== wt_old[3] ) {
//             /*let old_freq = wt_old[0];
//             old_freq = 131072 / (2048 - old_freq);
//             poly.triggerRelease(old_freq);*/
//             change = 1;
//             wt_old = wt_new;
//             freq = 131072 / (2048 - freq);
//             switch (vol) {
//                 case 0:
//                     vol = 1 + 0;
//                     break;
//                 case 1:
//                     //vol = 5;
//                     vol = 1 + 0.2;
//                     break;
//                 case 2:
//                     //vol = 10;
//                     vol = 1 + 0.4;
//                     break;
//                 case 3:
//                     //vol = 15;
//                     vol = 1 + 0.6;
//                     break;
//                 default:
//                     alert("Something is up. Do your sound volume correctly!");
//             }
//             //vol = vol * (30 / 16); //20 + vol * (30 / 16)
//             //sw1 = new Tone.Synth(); Ancient
//             wt.triggerAttack(freq);
//             wt.volume.value = vol;
//             //poly.triggerAttack(freq, Tone.now(), vol);
//             if (dump_instr === 1) {
//                 console.log("WvTbl Noise made: freq " + freq);
//             }
//         }
//     } else {
//         if (wt_old[3] === 1) {
//             change = 1;
//             freq = wt_old[0];
//             freq = 131072 / (2048 - freq);
//             wt.triggerRelease();
//             wt.volume.value = 0;
//             //poly.triggerRelease(freq);
//             wt_old[3] = 0;
//             if (dump_instr === 1) {
//                 console.log("WvTbl Noise stopped");
//             }
//         }
//     }
//     //Noise Generator
//     if ((XFF[0x23] & 0b1000_0000) >> 7 === 1) {
//         alert("BEEEP! G");
//          snd_abort = true;
//         /*let r = XFF[0x22] & 0b111;
//         if (r === 0) {
//             r = 0.5;
//         }
//         let s = (XFF[0x22] & 0b1111_0000) >> 4;
//         let freq = 524288 / r / Math.pow(2, s + 1);*/
//         let vol = (XFF[0x17] & 0b1111_0000) >> 4;
//         let ng_new = [0, vol, undefined, 1];
//         if ( ng_new[0] !== ng_old[0] || ng_new[1] !== ng_old[1] || ng_new[3] !== ng_old[3] ) {
//             change = 1;
//             ng_old = ng_new;
//             vol = vol * (30 / 16); //20 + vol * (30 / 16)
//             //ng = new Tone.Noise("white");
//             ng.start();
//             ng.volume.value = vol;
//             if (dump_instr === 1) {
//                 console.log("NsGen Noise made");
//             }
//         }
//     } else {
//         if (ng_old[3] === 1) {
//             change = 1;
//             //ng.disconnect(mixer, 0, 0);
//             ng.stop();
//             //ng = undefined;
//             ng.volume.value = 0;
//             ng_old[3] = 0;
//             if (dump_instr === 1) {
//                 console.log("NsGen Noise stopped");
//             }
//         }
//     }

//     if (change === 1) {
//         /*mixer = new Tone.Merge().toMaster();
//         if (sw1 !== undefined) {
//             sw1.connect(mixer, 0, 1).start();
//         }
//         if (sw2 !== undefined) {
//             //sw2.connect(mixer, 0, 0).start();
//         }
//         if (ng !== undefined) {
//             ng.connect(mixer, 0, 0).start();
//         }*/
//     }

//     return XFF;
// }

//let sine = new Tone.Oscillator(500, "sine");
//sine.toMaster().start();
//let square = new Tone.Oscillator(500, "square");
//square.toMaster().start();
//let triangle = new Tone.Oscillator(500, "triangle");
//triangle.toMaster().start();
//let sawtooth = new Tone.Oscillator(500, "sawtooth");
//sawtooth.toMaster().start();

function frame_sequencer(XFF) {
    if ((XFF[0x26] & 0b1000_0000) >> 7 === 1) {
        switch (frame_seq) {
            case 0:
                XFF = length_counter(XFF);
                break;
            case 1:
                break;
            case 2:
                XFF = length_counter(XFF);
                XFF = sweep(XFF);
                break;
            case 3:
                break;
            case 4:
                XFF = length_counter(XFF);
                break;
            case 5:
                break;
            case 6:
                XFF = length_counter(XFF);
                XFF = sweep(XFF);
                break;
            case 7:
                //XFF = volume_envelope(XFF);
                XFF = play_channels(XFF);
                break;
            default:
                alert("THis is immpossible. frame_seq set inncorrectly");
        }
        frame_seq += 1;
        frame_seq &= 0b111;
    } else {
        frame_seq = 0;
    }
    seconds += 0.001953125;

    return XFF;
}

function stop_all() {
    sw1.volume.value = 0;
    sw2.volume.value = 0;
    wt.volume.value = 0;
    ng.volume.value = 0;
    master_mixer.volume.value = 0;
}
