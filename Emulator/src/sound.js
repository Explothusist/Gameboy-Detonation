
let sound = document.getElementById("sound");
let speed = document.getElementById("speed");
let volume_level = document.getElementById("volume");

let sq1_toggle = document.getElementById("sq1_toggle");
let sq2_toggle = document.getElementById("sq2_toggle");
let wave_toggle = document.getElementById("wave_toggle");
let ns_toggle = document.getElementById("noise_toggle");
let smooth_snd = document.getElementById("smooth_sound");

let square_1_toggle;
let square_2_toggle;
let wave_table_toggle;
let noise_toggle;

let master_source_node;

let audio_ctx;
let sound_enabled = false;
// let audio_merger;

let process_sq1 = true;
let process_sq2 = true;
let process_wave = true;
let process_noise = true;
let smooth_sound = true;

let volume_adjustment = 1;

sound.onclick = function () {
    audio_ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });

    // Create an empty three-second stereo buffer at the sample rate of the AudioContext
    const myArrayBuffer = audio_ctx.createBuffer(2, audio_ctx.sampleRate * 0.25, audio_ctx.sampleRate);

    // Fill the buffer with white noise_gen;
    // just random values between -1.0 and 1.0
    for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
        // This gives us the actual array that contains the data
        const nowBuffering = myArrayBuffer.getChannelData(channel);
        for (let i = 0; i < myArrayBuffer.length; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            // nowBuffering[i] = Math.random() * 2 - 1;
            nowBuffering[i] = Math.sin(i*0.25)*0.25*volume_adjustment;
        }
    }

    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    const source = audio_ctx.createBufferSource();

    // set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;

    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(audio_ctx.destination);

    // start the source playing
    source.start();
    sound_enabled = true;

    TriggerBufferReset(master.id, XFF00);
    speed.innerHTML = "<h3> Speed: " + (Math.round(full_speed/ms_per_cycle*100)) + "%</h3>";
};

sq1_toggle.addEventListener("change", function () {
    if (sound_enabled) {
        if (sq1_toggle.checked === true) {
            square_1_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
            process_sq1 = true;
        } else {
            square_1_toggle.gain.setValueAtTime(0, audio_ctx.currentTime);
            process_sq1 = false;
        }
    }
});
sq2_toggle.addEventListener("change", function () {
    if (sound_enabled) {
        if (sq2_toggle.checked === true) {
            square_2_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
            process_sq2 = true;
        } else {
            square_2_toggle.gain.setValueAtTime(0, audio_ctx.currentTime);
            process_sq2 = false;
        }
    }
});
wave_toggle.addEventListener("change", function () {
    if (sound_enabled) {
        if (wave_toggle.checked === true) {
            wave_table_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
            process_wave = true;
        } else {
            wave_table_toggle.gain.setValueAtTime(0, audio_ctx.currentTime);
            process_wave = false;
        }
    }
});
ns_toggle.addEventListener("change", function () {
    if (sound_enabled) {
        if (ns_toggle.checked === true) {
            noise_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
            process_noise = true;
        } else {
            noise_toggle.gain.setValueAtTime(0, audio_ctx.currentTime);
            process_noise = false;
        }
    }
});
smooth_snd.addEventListener("change", function () {
    if (sound_enabled) {
        if (smooth_snd.checked === true) {
            smooth_sound = true;
            TriggerBufferReset(master.id);
        } else {
            smooth_sound = false;
            TriggerBufferReset(master.id);
        }
    }
});

volume_level.addEventListener("change", function () {
    volume_adjustment = volume_level.valueAsNumber/100;
    // console.log(volume_adjustment);
});


let old_time = -1;
let num_of_cycles = 0;
let ms_per_cycle = 2.3866e-7;
let full_speed = 2.3866e-7;
let watchdog_ms_per_cycle = 2.3866e-7;
let half_ms = true;


let master_buffer;
let master_buffer_left_data;
let master_buffer_right_data;
let master_buffer_pos = -1;

let old_xff = [];

class Square_1 {

    constructor() {
        this.old_frequency = 0;
        this.freq_change = false;

        this.length_counter = 0;
        this.sweep_counter = 0;
        this.shadow_freq = 0;
        this.volume = 15;

        this.env_tick = 0;
        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 0;
        this.started = false;

        this.left_blip = 0;
        this.right_blip = 0;
    }
    get_sweep_period(XFF) {
        return (XFF[0x10] & 0b0111_0000) >> 4;
    }
    get_negate_shift(XFF) {
        return (XFF[0x10] & 0b0000_1000) >> 3;
    }
    get_shift(XFF) {
        return (XFF[0x10] & 0b0000_0111);
    }
    get_duty(XFF) {
        return (XFF[0x11] & 0b1100_0000) >> 6;
    }
    get_length_load(XFF) {
        return (XFF[0x11] & 0b0011_1111);
    }
    get_volume(XFF) {
        return (XFF[0x12] & 0b1111_0000) >> 4;
    }
    get_envelope_mode(XFF) {
        return (XFF[0x12] & 0b0000_1000) >> 3;
    }
    get_envelope_period(XFF) {
        return (XFF[0x12] & 0b0000_0111);
    }
    get_frequency(XFF) {
        return XFF[0x13] + ((XFF[0x14] & 0b0000_0111) << 8);
    }
    get_enable(XFF) {
        return (XFF[0x14] & 0b1000_0000) >> 7;
    }
    get_length_enable(XFF) {
        return (XFF[0x14] & 0b0100_0000) >> 6;
    }
    set_sweep_period(XFF, value) {
        value &= 0b111;
        XFF[0x10] &= 0b1000_1111;
        XFF[0x10] |= (value << 4);
        return XFF;
    }
    set_negate_shift(XFF, value) {
        value &= 0b1;
        XFF[0x10] &= 0b1111_0111;
        XFF[0x10] |= (value << 3);
        return XFF;
    }
    set_shift(XFF, value) {
        value &= 0b111;
        XFF[0x10] &= 0b1111_1000;
        XFF[0x10] |= value;
        return XFF;
    }
    set_duty(XFF, value) {
        value &= 0b11;
        XFF[0x11] &= 0b0011_1111;
        XFF[0x11] |= (value << 6);
        return XFF;
    }
    set_length_load(XFF, value) {
        value &= 0b11_1111;
        XFF[0x11] &= 0b1100_0000;
        XFF[0x11] |= value;
        return XFF;
    }
    set_volume(XFF, value) {
        value &= 0b1111;
        XFF[0x12] &= 0b0000_1111;
        XFF[0x12] |= (value << 4);
        return XFF;
    }
    set_envelope_mode(XFF, value) {
        value &= 0b1;
        XFF[0x12] &= 0b1111_0111;
        XFF[0x12] |= (value << 3);
        return XFF;
    }
    set_envelope_period(XFF, value) {
        value &= 0b111;
        XFF[0x12] &= 0b1111_1000;
        XFF[0x12] |= value;
        return XFF;
    }
    set_frequency(XFF, value) {
        let low = value & 0b1111_1111;
        let high = (value & 0b111_0000_0000) >> 8;
        XFF[0x13] = low;
        XFF[0x14] &= 0b1111_1000;
        XFF[0x14] |= high;
        return XFF;
    }
    set_enable(XFF, value) {
        value &= 0b1;
        XFF[0x14] &= 0b0111_1111;
        XFF[0x14] |= (value << 7);
        return XFF;
    }
    set_length_enable(XFF, value) {
        value &= 0b1;
        XFF[0x14] &= 0b1011_1111;
        XFF[0x14] |= (value << 6);
        return XFF;
    }

    clear_all(XFF) {
        XFF[0x10] = 0;
        XFF[0x11] = 0;
        XFF[0x12] = 0;
        XFF[0x13] = 0;
        XFF[0x14] = 0;
        return XFF;
    }
    load_length(XFF) {
        this.length_counter = this.get_length_load(XFF);
        console.log("Build (1)("+this.length_counter+")");
    }
    load_volume(XFF) {
        this.volume = this.get_volume(XFF);
        // console.log("Plant (1)("+this.volume+")");
    }
};
class Square_2 {

    constructor() {
        this.old_frequency = 0;
        this.freq_change = false;

        this.length_counter = 0;
        this.volume = 15;

        this.env_tick = 0;
        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 1;
        this.started = false;

        this.left_blip = 0;
        this.right_blip = 0;
    }
    get_duty(XFF) {
        return (XFF[0x16] & 0b1100_0000) >> 6;
    }
    get_length_load(XFF) {
        return (XFF[0x16] & 0b0011_1111);
    }
    get_volume(XFF) {
        return (XFF[0x17] & 0b1111_0000) >> 4;
    }
    get_envelope_mode(XFF) {
        return (XFF[0x17] & 0b0000_1000) >> 3;
    }
    get_envelope_period(XFF) {
        return (XFF[0x17] & 0b0000_0111);
    }
    get_frequency(XFF) {
        return XFF[0x18] + ((XFF[0x19] & 0b0000_0111) << 8);
    }
    get_enable(XFF) {
        return (XFF[0x19] & 0b1000_0000) >> 7;
    }
    get_length_enable(XFF) {
        return (XFF[0x19] & 0b0100_0000) >> 6;
    }
    set_duty(XFF, value) {
        value &= 0b11;
        XFF[0x16] &= 0b0011_1111;
        XFF[0x16] |= (value << 6);
        return XFF;
    }
    set_length_load(XFF, value) {
        value &= 0b11_1111;
        XFF[0x16] &= 0b1100_0000;
        XFF[0x16] |= value;
        return XFF;
    }
    set_volume(XFF, value) {
        value &= 0b1111;
        XFF[0x17] &= 0b0000_1111;
        XFF[0x17] |= (value << 4);
        return XFF;
    }
    set_envelope_mode(XFF, value) {
        value &= 0b1;
        XFF[0x17] &= 0b1111_0111;
        XFF[0x17] |= (value << 3);
        return XFF;
    }
    set_envelope_period(XFF, value) {
        value &= 0b111;
        XFF[0x17] &= 0b1111_1000;
        XFF[0x17] |= value;
        return XFF;
    }
    set_frequency(XFF, value) {
        let low = value & 0b1111_1111;
        let high = (value & 0b111_0000_0000) >> 8;
        XFF[0x18] = low;
        XFF[0x19] &= 0b1111_1000;
        XFF[0x19] |= high;
        return XFF;
    }
    set_enable(XFF, value) {
        value &= 0b1;
        XFF[0x19] &= 0b0111_1111;
        XFF[0x19] |= (value << 7);
        return XFF;
    }
    set_length_enable(XFF, value) {
        value &= 0b1;
        XFF[0x19] &= 0b1011_1111;
        XFF[0x19] |= (value << 6);
        return XFF;
    }

    clear_all(XFF) {
        XFF[0x15] = 0;
        XFF[0x16] = 0;
        XFF[0x17] = 0;
        XFF[0x18] = 0;
        XFF[0x19] = 0;
        return XFF;
    }
    load_length(XFF) {
        this.length_counter = this.get_length_load(XFF);
        console.log("Build (2)("+this.length_counter+")");
    }
    load_volume(XFF) {
        this.volume = this.get_volume(XFF);
        // console.log("Plant (2)("+this.volume+")");
    }
};
class Wave_Table {

    constructor() {
        this.old_frequency = 0;
        this.freq_change = false;

        this.length_counter = 0;

        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 2;
        this.started = false;

        this.left_blip = 0;
        this.right_blip = 0;
    }
    get_dac_power(XFF) {
        return (XFF[0x1A] & 0b1000_0000) >> 7;
    }
    get_length_load(XFF) {
        return XFF[0x1B];
    }
    get_volume(XFF) {
        return (XFF[0x1C] & 0b0110_0000) >> 5;
    }
    get_frequency(XFF) {
        return XFF[0x1D] + ((XFF[0x1E] & 0b0000_0111) << 8);
    }
    get_enable(XFF) {
        return (XFF[0x1E] & 0b1000_0000) >> 7;
    }
    get_length_enable(XFF) {
        return (XFF[0x1E] & 0b0100_0000) >> 6;
    }
    set_dac_power(XFF, value) {
        value &= 0b1;
        XFF[0x1A] &= 0b0111_1111;
        XFF[0x1A] |= (value << 7);
        return XFF;
    }
    set_length_load(XFF, value) {
        value &= 0b1111_1111;
        XFF[0x1B] = value;
        return XFF;
    }
    set_volume(XFF, value) {
        value &= 0b11;
        XFF[0x1C] &= 0b1001_1111;
        XFF[0x1C] |= (value << 5);
        return XFF;
    }
    set_frequency(XFF, value) {
        let low = value & 0b1111_1111;
        let high = (value & 0b111_0000_0000) >> 8;
        XFF[0x1D] = low;
        XFF[0x1E] &= 0b1111_1000;
        XFF[0x1E] |= high;
        return XFF;
    }
    set_enable(XFF, value) {
        value &= 0b1;
        XFF[0x1E] &= 0b0111_1111;
        XFF[0x1E] |= (value << 7);
        return XFF;
    }
    set_length_enable(XFF, value) {
        value &= 0b1;
        XFF[0x1E] &= 0b1011_1111;
        XFF[0x1E] |= (value << 6);
        return XFF;
    }

    clear_all(XFF) {
        XFF[0x1A] = 0;
        XFF[0x1B] = 0;
        XFF[0x1C] = 0;
        XFF[0x1D] = 0;
        XFF[0x1E] = 0;
    }
    load_length(XFF) {
        this.length_counter = this.get_length_load(XFF);
        console.log("Build (3)("+this.length_counter+")");
    }
};
let noise_divisors = [8, 16, 32, 48, 64, 80, 96, 112];
class Noise_Gen {

    constructor() {
        this.old_frequency = 0;
        this.freq_change = false;
        this.lfsr = 0;

        this.length_counter = 0;
        this.volume = 15;

        this.clock_tick = 0;

        this.env_tick = 0;
        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 3;
        this.started = false;

        this.left_blip = 0;
        this.right_blip = 0;
    }
    get_length_load(XFF) {
        return (XFF[0x20] & 0b0011_1111);
    }
    get_volume(XFF) {
        return (XFF[0x21] & 0b1111_0000) >> 4;
    }
    get_envelope_mode(XFF) {
        return (XFF[0x21] & 0b0000_1000) >> 3;
    }
    get_envelope_period(XFF) {
        return (XFF[0x21] & 0b0000_0111);
    }
    get_clock_shift(XFF) {
        return ((XFF[0x22] & 0b1111_0000) >> 4);
    }
    get_width_mode(XFF) {
        return (XFF[0x22] & 0b0000_1000) >> 3;
    }
    get_divisor_code(XFF) {
        return (XFF[0x22] & 0b0000_0111);
    }
    get_divisor(XFF) {
        return noise_divisors[this.get_divisor_code(XFF)];
    }
    get_enable(XFF) {
        return (XFF[0x23] & 0b1000_0000) >> 7;
    }
    get_length_enable(XFF) {
        return (XFF[0x23] & 0b0100_0000) >> 6;
    }
    set_length_load(XFF, value) {
        value &= 0b11_1111;
        XFF[0x20] &= 0b1100_0000;
        XFF[0x20] |= value;
        return XFF;
    }
    set_volume(XFF, value) {
        value &= 0b1111;
        XFF[0x21] &= 0b0000_1111;
        XFF[0x21] |= (value << 4);
        return XFF;
    }
    set_envelope_mode(XFF, value) {
        value &= 0b1;
        XFF[0x21] &= 0b1111_0111;
        XFF[0x21] |= (value << 3);
        return XFF;
    }
    set_envelope_period(XFF, value) {
        value &= 0b111;
        XFF[0x21] &= 0b1111_1000;
        XFF[0x21] |= value;
        return XFF;
    }
    set_clock_shift(XFF, value) {
        value &= 0b1111;
        XFF[0x22] &= 0b0000_1111;
        XFF[0x22] |= (value << 4);
        return XFF;
    }
    set_width_mode(XFF, value) {
        value &= 0b1;
        XFF[0x22] &= 0b1111_0111;
        XFF[0x22] |= (value << 3);
        return XFF;
    }
    set_divisor_code(XFF, value) {
        value &= 0b111;
        XFF[0x22] &= 0b1111_1000;
        XFF[0x22] |= value;
        return XFF;
    }
    set_enable(XFF, value) {
        value &= 0b1;
        XFF[0x23] &= 0b0111_1111;
        XFF[0x23] |= (value << 7);
        return XFF;
    }
    set_length_enable(XFF, value) {
        value &= 0b1;
        XFF[0x23] &= 0b1011_1111;
        XFF[0x23] |= (value << 6);
        return XFF;
    }

    clear_all(XFF) {
        XFF[0x1F] = 0;
        XFF[0x20] = 0;
        XFF[0x21] = 0;
        XFF[0x22] = 0;
        XFF[0x23] = 0;
        return XFF;
    }
    load_length(XFF) {
        this.length_counter = this.get_length_load(XFF);
        console.log("Build (4)("+this.length_counter+")");
    }
    load_volume(XFF) {
        this.volume = this.get_volume(XFF);
        // console.log("Plant (4)("+this.volume+")");
    }
};
class Control {

    constructor() {
        
    }
    get_left_vol(XFF) {
        return (XFF[0x24] & 0b0111_0000) >> 4;
    }
    get_right_vol(XFF) {
        return (XFF[0x24] & 0b0000_0111);
    }
    get_noi_left(XFF) {
        return (XFF[0x25] & 0b1000_0000) >> 7;
    }
    get_wav_left(XFF) {
        return (XFF[0x25] & 0b0100_0000) >> 6;
    }
    get_sq2_left(XFF) {
        return (XFF[0x25] & 0b0010_0000) >> 5;
    }
    get_sq1_left(XFF) {
        return (XFF[0x25] & 0b0001_0000) >> 4;
    }
    get_noi_right(XFF) {
        return (XFF[0x25] & 0b0000_1000) >> 3;
    }
    get_wav_right(XFF) {
        return (XFF[0x25] & 0b0000_0100) >> 2;
    }
    get_sq2_right(XFF) {
        return (XFF[0x25] & 0b0000_0010) >> 1;
    }
    get_sq1_right(XFF) {
        return (XFF[0x25] & 0b0000_0001);
    }
    get_enable(XFF) {
        return (XFF[0x26] & 0b1000_0000) >> 7;
    }
    set_left_vol(XFF, value) {
        value &= 0b111;
        XFF[0x24] &= 0b1000_1111;
        XFF[0x24] |= (value << 4);
        return XFF;
    }
    set_right_vol(XFF, value) {
        value &= 0b111;
        XFF[0x24] &= 0b1111_1000;
        XFF[0x24] |= value;
        return XFF;
    }
    set_noi_left(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b0111_1111;
        XFF[0x25] |= (value << 7);
        return XFF;
    }
    set_wav_left(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1011_1111;
        XFF[0x25] |= (value << 6);
        return XFF;
    }
    set_sq2_left(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1101_1111;
        XFF[0x25] |= (value << 5);
        return XFF;
    }
    set_sq1_left(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1110_1111;
        XFF[0x25] |= (value << 4);
        return XFF;
    }
    set_noi_right(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1111_0111;
        XFF[0x25] |= (value << 3);
        return XFF;
    }
    set_wav_right(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1111_1011;
        XFF[0x25] |= (value << 2);
        return XFF;
    }
    set_sq2_right(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1111_1101;
        XFF[0x25] |= (value << 1);
        return XFF;
    }
    set_sq1_right(XFF, value) {
        value &= 0b1;
        XFF[0x25] &= 0b1111_1110;
        XFF[0x25] |= value;
        return XFF;
    }
    set_enable(XFF, value) {
        value &= 0b1;
        XFF[0x26] &= 0b0111_1111;
        XFF[0x26] |= (value << 7);
        return XFF;
    }

    clear_all(XFF) {
        XFF[0x24] = 0;
        XFF[0x25] = 0;
        return XFF;
    }
    load_length(XFF) {
        this.length_counter = this.get_length_load(XFF);
    }
};
class Master {
    constructor() {
        this.cycles = 0;
        this.id = 4;
        this.started = false;

        this.left_blip = 0;
        this.right_blip = 0;
    }
}

let square_1 = new Square_1();
let square_2 = new Square_2();
let wave_table = new Wave_Table();
let noise_gen = new Noise_Gen();

let control = new Control();
let master = new Master();

let frame_seq = 0;

// function playByteArray( bytes ) {
//     var buffer = new Uint8Array( bytes.length );
//     buffer.set( new Uint8Array(bytes), 0 );

//     context.decodeAudioData(buffer.buffer, play);
// };

// function play( audioBuffer ) {
//     var source = audio_ctx.createBufferSource();
//     source.buffer = audioBuffer;
//     source.connect( context.destination );
//     source.start(0);
// };

let oneOver15 = 1/15;
let oneOver8 = 1/8;

let duty0 = [0, 0, 0, 0, 0, 0, 0, 1];
let duty1 = [1, 0, 0, 0, 0, 0, 0, 1];
let duty2 = [1, 0, 0, 0, 0, 1, 1, 1];
let duty3 = [0, 1, 1, 1, 1, 1, 1, 0];
// let duty0_half = [0, 0, 0, 1];
// let duty1_half = [0, 0, 0, 1];
// let duty2_half = [0, 0, 1, 1];
// let duty3_half = [1, 1, 1, 0];
// let duty0_quarter = [0, 1];
// let duty1_quarter = [0, 1];
// let duty2_quarter = [0, 1];
// let duty3_quarter = [1, 0];
function getSquareWave(tick, duty) {
    switch (duty) {
        case 0:
            return duty0[tick];
        case 1:
            return duty1[tick];
        case 2:
            return duty2[tick];
        case 3:
            return duty3[tick];
    }
};
function getWaveTableWave(tick, XFF) {
    tick = tick % 32;
    let reg_num = 0x30 + Math.floor(tick/2);
    let shift = 0;
    if (wave_table.get_volume(XFF) === 0) {
        shift = 4;
    }else {
        shift = wave_table.get_volume(XFF)-1;
    }
    if (tick % 2 === 0) {
        return (((XFF[reg_num] & 0xf0) >> 4) >> shift)*oneOver15;
    }else {
        return ((XFF[reg_num] & 0x0f) >> shift)*oneOver15;
    }
};
function getNoiseGeneratorBlip(XFF) {
    let low_bit = noise_gen.lfsr & 1;
    let new_bit = low_bit ^ ((noise_gen.lfsr & 0b10) >> 1);
    noise_gen.lfsr >>= 1;
    if (new_bit === 0) {
        noise_gen.lfsr |= (1 << 14);
        if (noise_gen.get_width_mode(XFF) === 1) {
            noise_gen.lfsr &= !(1 << 6);
            noise_gen.lfsr |= (1 << 6);
        }
    }
    // speed.innerHTML = "<h3> LFSR: " + noise_gen.lfsr.toString(2).padStart(16, "0") + "</h3>";
    return low_bit;
};

function AddAudioBlip(channel, left_blip, right_blip, XFF) {
    switch (channel) {
        case master.id:
            if (master_buffer_pos > master_buffer_left_data.length) {
                master_buffer_pos = 0;
                master.started = false;
                // TriggerBufferReset(channel, XFF);
            }
            master_buffer_left_data[master_buffer_pos] = left_blip;
            master_buffer_right_data[master_buffer_pos] = right_blip;
            master_buffer_pos += 1;
            // console.log(master_buffer_pos);
            break;
    }
};

function TriggerBufferReset(channel, XFF) {
    switch (channel) {
        case master.id:
            if (!smooth_sound) {
                master_buffer = audio_ctx.createBuffer(2, 48000*2, 48000);
            }else {
                master_buffer = audio_ctx.createBuffer(2, 96000*2, 96000);
            }
            master_buffer_left_data = master_buffer.getChannelData(0);
            master_buffer_right_data = master_buffer.getChannelData(1);
            master.started = false;
            master_buffer_pos = 0;
            // console.log("Master Stream Reloaded");
            break;
    }
};

function TriggerAudioChannel(channel, XFF) {
    switch (channel) {
        case master.id:
            try {
                master_source_node.disconnect();
            }
            catch (err) {}
            // console.log("Master Stream Started");
            master_source_node = audio_ctx.createBufferSource();
            master_source_node.buffer = master_buffer;
            master_source_node.connect(audio_ctx.destination);
            // master_source_node.loop = true;
            master_source_node.start();
            master.started = true;
    }
};

let store_cycles = 0;
let cycle_cuttoff = 7000000; // just under 100 frames
let watchdog_cuttoff = 1000000; // just under 100 frames

let initial_buffer = 5000;
let old_time_precise = 0;

let sound_by_ms = true; // system ms vs CPU cycles

let overflow_cycles = 0;

function channel_clocker(cycles, XFF) {
    if (sound_enabled) {

        if (old_time !== -1) {
            store_cycles += cycles;
            if (old_time !== Math.floor(audio_ctx.currentTime)) {
                if (!half_ms) {
                    watchdog_ms_per_cycle = 1/store_cycles;
                    ms_per_cycle = (ms_per_cycle*0.9)+(1/store_cycles*0.1);

                    if (ms_per_cycle/watchdog_ms_per_cycle < 0.90 || ms_per_cycle/watchdog_ms_per_cycle > 1.10) {
                        ms_per_cycle = watchdog_ms_per_cycle;
                        // console.log("Watchdog!");
                    }
                    
                    speed.innerHTML = "<h3> Speed: " + (Math.round(full_speed/ms_per_cycle*100)) + "%</h3>" + "<h3> (Watchdog): " + (Math.round(full_speed/watchdog_ms_per_cycle*100)) + "%</h3>";
                }else {
                    half_ms = false;
                }
                store_cycles = 0;
                old_time = Math.floor(audio_ctx.currentTime);
            }
        }else {
            old_time = audio_ctx.currentTime;
        }

        if (sound_by_ms) {
            if (old_time_precise !== 0) {
                cycles = (audio_ctx.currentTime-old_time_precise)*(1/full_speed);
            }
            old_time_precise = audio_ctx.currentTime;
        }else {
            // Generate sound faster when running slow so that frequencies
            // do not change.
            cycles *= (ms_per_cycle/full_speed)*1.05;
        }

        overflow_cycles += cycles;
        let run_per = 87.38133;
        if (smooth_sound) {
            run_per *= 0.5;
        }
        while (overflow_cycles >= run_per) {
            overflow_cycles -= run_per;
            cycles = run_per;
            // Square Wave 1
            if (process_sq1) {
                square_1.cycles += cycles;
                while (square_1.cycles >= (2048-square_1.get_frequency(XFF))*4) {
                    square_1.cycles -= (2048-square_1.get_frequency(XFF))*4;
                    square_1.clock_tick += 1;
                    square_1.clock_tick &= 0b111;

                    // Remap to -1, 1
                    if (control.get_enable(XFF) === 1 && square_1.get_enable(XFF) === 1) {
                        let blip = getSquareWave(square_1.clock_tick, square_1.get_duty(XFF));
                        square_1.left_blip = blip*(square_1.volume*oneOver15)*((control.get_left_vol(XFF)+1)*oneOver8)*control.get_sq1_left(XFF);
                        square_1.right_blip = blip*(square_1.volume*oneOver15)*((control.get_right_vol(XFF)+1)*oneOver8)*control.get_sq1_right(XFF);
                        // AddAudioBlip(square_1.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                    }else {
                        // console.log("SqWv1 Disabled");
                        // AddAudioBlip(square_1.id, 0, 0, XFF);
                    }
                }
            }

            // Square Wave 2
            if (process_sq2) {
                square_2.cycles += cycles;
                while (square_2.cycles >= (2048-square_2.get_frequency(XFF))*4) {
                    square_2.cycles -= (2048-square_2.get_frequency(XFF))*4;
                    square_2.clock_tick += 1;
                    square_2.clock_tick &= 0b111;

                    // Remap to -1, 1
                    if (control.get_enable(XFF) === 1 && square_2.get_enable(XFF) === 1) {
                        let blip = getSquareWave(square_2.clock_tick, square_2.get_duty(XFF));
                        square_2.left_blip = blip*(square_2.volume*oneOver15)*((control.get_left_vol(XFF)+1)*oneOver8)*control.get_sq2_left(XFF);
                        square_2.right_blip = blip*(square_2.volume*oneOver15)*((control.get_right_vol(XFF)+1)*oneOver8)*control.get_sq2_right(XFF);
                        // AddAudioBlip(square_2.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                    }else {
                        // console.log("SqWv2 Disabled");
                        // AddAudioBlip(square_2.id, 0, 0, XFF);
                    }
                }
            }
            
            // Wave Table
            if (process_wave) {
                wave_table.cycles += cycles;
                while (wave_table.cycles >= (2048-wave_table.get_frequency(XFF))*2) {
                    wave_table.cycles -= (2048-wave_table.get_frequency(XFF))*2;
                    wave_table.clock_tick += 1;
                    wave_table.clock_tick &= 0b1_1111;

                    // Remap to -1, 1
                    if (control.get_enable(XFF) === 1 && wave_table.get_enable(XFF) === 1 && wave_table.get_dac_power(XFF) === 1) {
                        let blip = getWaveTableWave(wave_table.clock_tick, XFF);
                        wave_table.left_blip = blip*((control.get_left_vol(XFF)+1)*oneOver8)*control.get_wav_left(XFF);
                        wave_table.right_blip = blip*((control.get_right_vol(XFF)+1)*oneOver8)*control.get_wav_right(XFF);
                        // AddAudioBlip(wave_table.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                    }else {
                        // AddAudioBlip(wave_table.id, 0, 0, XFF);
                    }
                }
            }
            
            // Noise Generator
            if (process_noise) {
                noise_gen.cycles += cycles;
                while (noise_gen.cycles >= (noise_gen.get_divisor(XFF) << noise_gen.get_clock_shift(XFF))) {
                    noise_gen.cycles -= (noise_gen.get_divisor(XFF) << noise_gen.get_clock_shift(XFF));
                    // noise_gen.cycles -= (noise_gen.get_divisor_code(XFF)+1)*2;
                    // noise_gen.clock_tick -= 1;
                    
                    // if (noise_gen.clock_tick <= 0) {
                    // noise_gen.clock_tick = 1 << (noise_gen.get_clock_shift(XFF)+1);

                    // Remap to -1, 1
                    if (control.get_enable(XFF) === 1 && noise_gen.get_enable(XFF) === 1) {
                        let blip = getNoiseGeneratorBlip(XFF);
                        noise_gen.left_blip = blip*(noise_gen.volume*oneOver15)*((control.get_left_vol(XFF)+1)*oneOver8)*control.get_noi_left(XFF);
                        noise_gen.right_blip = blip*(noise_gen.volume*oneOver15)*((control.get_right_vol(XFF)+1)*oneOver8)*control.get_noi_right(XFF);
                        // console.log(blip, left_blip, right_blip);
                        // console.log(blip, noise_gen.get_volume(XFF), control.get_left_vol(XFF), control.get_noi_left(XFF));
                        // console.log(blip, noise_gen.get_volume(XFF), control.get_right_vol(XFF), control.get_noi_right(XFF));
                        // AddAudioBlip(noise_gen.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                    }else {
                        // AddAudioBlip(noise_gen.id, 0, 0, XFF);
                    }
                }
            }

            // master.cycles += cycles;
            // while (master.cycles >= run_per) {
            //     master.cycles -= run_per;
            
            if (control.get_enable(XFF) === 1) {
                let left_blip = (square_1.left_blip+square_2.left_blip+wave_table.left_blip+noise_gen.left_blip)*0.25*volume_adjustment;
                let right_blip = (square_1.right_blip+square_2.right_blip+wave_table.right_blip+noise_gen.right_blip)*0.25*volume_adjustment;
                AddAudioBlip(master.id, left_blip, right_blip, XFF);
            }else {
                AddAudioBlip(master.id, 0, 0, XFF);
            }
            if (master_buffer_pos >= initial_buffer && !master.started) {
                TriggerAudioChannel(master.id, XFF);
            }
            // }
        }
        
        let statuses = 0;
        statuses |= 0b0001*square_1.get_enable(XFF);
        statuses |= 0b0010*square_2.get_enable(XFF);
        statuses |= 0b0100*wave_table.get_enable(XFF)*wave_table.get_dac_power(XFF);
        statuses |= 0b1000*noise_gen.get_enable(XFF);
        XFF[0x26] &= 0xf0;
        XFF[0x26] |= statuses;
    }
    return XFF;
};

function length_counter(XFF) {

    // Square Wave 1
    if (/*square_1.get_enable(XFF) === 1 && */square_1.get_length_enable(XFF) === 1 && process_sq1) {
        square_1.length_counter += 1;
        square_1.length_counter &= 0b11_1111;
        console.log("Progress (1): "+square_1.length_counter);
        if (square_1.length_counter === 0) {
            XFF = square_1.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                // console.log("SqWv1 Length counter triggered ------- SHUT OFF");
            // }
            square_1.load_length(XFF);
            console.log("Purged (1)");
        }
        // console.log("SqWv1 Length counter triggered");
    }
    //Square Wave 2
    if (/*square_2.get_enable(XFF) === 1 && */square_2.get_length_enable(XFF) === 1 && process_sq2) {
        square_2.length_counter += 1;
        square_2.length_counter &= 0b11_1111;
        if (square_2.length_counter === 0) {
            XFF = square_2.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                // console.log("SqWv2 Length counter triggered shut off " + length);
            // }
            square_2.load_length(XFF);
            console.log("Purged (2)");
        }
        // console.log("SqWv2 Length counter triggered");
    }
    //Wave Table
    if (/*wave_table.get_enable(XFF) === 1 && */wave_table.get_length_enable(XFF) === 1 && process_wave) {
        wave_table.length_counter += 1;
        wave_table.length_counter &= 0b1111_1111;
        if (wave_table.length_counter === 0) {
            XFF = wave_table.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                // console.log("WvTbl Length counter triggered shut off " + length);
            // }
            wave_table.load_length(XFF);
            console.log("Purged (3)");
        }
        // console.log("WvTbl Length counter triggered: length " + length);
    }
    //Noise Generator
    if (/*noise_gen.get_enable(XFF) === 1 && */noise_gen.get_length_enable(XFF) === 1 && process_noise) {
        noise_gen.length_counter += 1;
        noise_gen.length_counter &= 0b11_1111;
        if (noise_gen.length_counter === 0) {
            XFF = noise_gen.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                // console.log("NsGen Length counter triggered shut off " + length);
                // console.log(noise_buffer_pos);
            // }
            noise_gen.load_length(XFF);
            console.log("Purged (4)");
        }
        // console.log("NsGen Length counter triggered: length " + length);
    }

    return XFF;
};

let oneOver1048576 = 1/1048756;
let oneOver48000 = 1/48000;
function sweep(XFF) {
    //Square Wave 1
    if (square_1.get_enable(XFF) === 1 && square_1.get_sweep_period(XFF) !== 0 && process_sq1) {
        square_1.sweep_counter -= 1;
        if (square_1.sweep_counter <= 0) {
            // if (dump_instr === 1) {
                // console.log("Sweep Triggered");
            // }
            square_1.sweep_counter = (square_1.get_sweep_period(XFF) !== 0) ? square_1.get_sweep_period(XFF) : 8;
            if (square_1.get_sweep_period(XFF) === 0 || square_1.get_shift(XFF) === 0) {
                XFF = square_1.set_enable(XFF, 0);
                // if (dump_instr === 1) {
                    // console.log("SqWv1 Disabled: Sweep");
                // }
            }
            // Should use shadow_frequency, but...
            let freq = square_1.get_frequency(XFF);
            // let freq = square_1.get_frequency(XFF);
            if (square_1.get_shift(XFF) !== 0) {
                let shadow_freq = freq >> square_1.get_shift(XFF);
                if (square_1.get_negate_shift(XFF) === 1) {
                    shadow_freq *= -1;
                }
                freq += shadow_freq;
                if (freq > 2047) {
                    XFF = square_1.set_enable(XFF, 0);
                    // console.log("SqWv1 Disabled: Sweep");
                } else {
                    XFF = square_1.set_frequency(XFF, freq);
                }
                square_1.shadow_freq = freq;
                // let hz = (2048-freq)*oneOver1048576;
                // square_1.time_mod = hz*oneOver48000;

                // if (dump_instr === 1) {
                    // console.log("Shift Successful");
                // }
                // TriggerBufferFreqChange(square_1.id, XFF);
            }
        }
    }

    return XFF;
}

function volume_envelope(XFF) {

    // Square Wave 1
    if (square_1.get_enable(XFF) === 1 && square_1.get_envelope_period(XFF) !== 0 && process_sq1) {
        square_1.env_tick += 1;
        if (square_1.env_tick > square_1.get_envelope_period(XFF)) {
            square_1.env_tick = 0;
            // let volume = square_1.get_volume(XFF);
            if (square_1.get_envelope_mode(XFF) === 0) {
                square_1.volume -= 1;
                if (square_1.volume < 0) {
                    square_1.volume = 0;
                    XFF = square_1.set_enable(XFF, 0);
                    // console.log("Harvested (1)");
                }
            }else {
                square_1.volume += 1;
                square_1.volume &= 0b1111;
            }
            // XFF = square_1.set_volume(XFF, volume);
        }
    }

    // Square Wave 2
    if (square_2.get_enable(XFF) === 1 && square_2.get_envelope_period(XFF) !== 0 && process_sq2) {
        square_2.env_tick += 1;
        if (square_2.env_tick > square_2.get_envelope_period(XFF)) {
            square_2.env_tick = 0;
            // let volume = square_2.get_volume(XFF);
            if (square_2.get_envelope_mode(XFF) === 0) {
                square_2.volume -= 1;
                if (square_2.volume < 0) {
                    square_2.volume = 0;
                    XFF = square_2.set_enable(XFF, 0);
                    // console.log("Harvested (2)");
                }
            }else {
                square_2.volume += 1;
                square_2.volume &= 0b1111;
            }
            // XFF = square_2.set_volume(XFF, volume);
        }
    }

    // Noise Generator
    if (noise_gen.get_enable(XFF) === 1 && noise_gen.get_envelope_period(XFF) !== 0 && process_noise) {
        noise_gen.env_tick += 1;
        if (noise_gen.env_tick > noise_gen.get_envelope_period(XFF)) {
            noise_gen.env_tick = 0;
            // let volume = noise_gen.get_volume(XFF);
            if (noise_gen.get_envelope_mode(XFF) === 0) {
                noise_gen.volume -= 1;
                if (noise_gen.volume < 0) {
                    noise_gen.volume = 0;
                    XFF = noise_gen.set_enable(XFF, 0);
                    // console.log("Harvested (4)");
                }
            }else {
                noise_gen.volume += 1;
                noise_gen.volume &= 0b1111;
            }
            // XFF = noise_gen.set_volume(XFF, volume);
        }
    }

    return XFF;
};

function frame_sequencer(XFF) {
    if (sound_enabled) {
        // console.log(ms_per_cycle);
        if (control.get_enable(XFF) === 1) {
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
                    XFF = volume_envelope(XFF);
                    break;
                default:
                    alert("THis is immpossible. frame_seq set inncorrectly");
            }
            frame_seq += 1;
            frame_seq &= 0b111;
        } else {
            frame_seq = 0;
        }
        // seconds += 0.001953125;
    }
    return XFF;
};

function stop_all_sound() {
    try {
        square_1_source_node.disconnect();
    }
    catch (err) {}
    try {
        square_2_source_node.disconnect();
    }
    catch (err) {}
    try {
        wave_table_source_node.disconnect();
    }
    catch (err) {}
    try {
        noise_source_node.disconnect();
    }
    catch (err) {}
    try {
        master_source_node.disconnect();
        master.started = false;
        master_buffer_pos = 0;
    }
    catch (err) {}
    half_ms = true;
};


function sound_handle_write_to_xff(XFF, pos, val) {
    if (pos === 0xff12) {
        //NR12 Length Counter
        square_1.load_volume(XFF);
    }
    if (pos === 0xff17) {
        //NR22 Length Counter
        square_2.load_volume(XFF);
    }
    if (pos === 0xff21) {
        //NR42 Length Counter
        noise_gen.load_volume(XFF);
    }

    if (pos === 0xff11) {
        //NR11 Length Counter
        square_1.load_length(XFF);
    }
    if (pos === 0xff16) {
        //NR21 Length Counter
        square_2.load_length(XFF);
    }
    if (pos === 0xff1b) {
        //NR31 Length Counter
        wave_table.load_length(XFF);
    }
    if (pos === 0xff20) {
        //NR41 Length Counter
        noise_gen.load_length(XFF);
    }
    
    if (pos === 0xff14) {
        if (((val & 0b1000_0000) >> 7) === 1) {
            square_1_enable_written = true;
            square_1.load_volume(XFF);
            console.log("Enabled Progress (1): "+square_1.length_counter);

            if ((frame_seq % 2) === 1) {
                square_1.length_counter += 1;
            }
        }
    }
    if (pos === 0xff19) {
        if (((val & 0b1000_0000) >> 7) === 1) {
            square_2_enable_written = true;
            square_2.load_volume(XFF);

            if ((frame_seq % 2) === 1) {
                square_2.length_counter += 1;
            }
        }
    }
    if (pos === 0xff1e) {
        if (((val & 0b1000_0000) >> 7) === 1) {
            wave_table_enable_written = true;

            if ((frame_seq % 2) === 1) {
                wave_table.length_counter += 1;
            }
        }
    }
    if (pos === 0xff23) {
        if (((val & 0b1000_0000) >> 7) === 1) {
            noise_enable_written = true;
            noise_gen.load_volume(XFF);

            if ((frame_seq % 2) === 1) {
                noise_gen.length_counter += 1;
            }
        }
    }

    if (pos === 0xff26) {
        if (((val & 0b1000_0000) >> 7) === 0) {
            XFF = clear_all_sound_registers(XFF);
        }
    }

    return XFF;
};