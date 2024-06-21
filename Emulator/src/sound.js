
let sound = document.getElementById("sound");
let speed = document.getElementById("speed");

let sq1_toggle = document.getElementById("sq1_toggle");
let sq2_toggle = document.getElementById("sq2_toggle");
let wave_toggle = document.getElementById("wave_toggle");
let ns_toggle = document.getElementById("noise_toggle");

let square_1_source_node;
let square_2_source_node;
let wave_table_source_node;
let noise_source_node;
let square_1_toggle;
let square_2_toggle;
let wave_table_toggle;
let noise_toggle;
let square_1_splitter;
let square_2_splitter;
let wave_table_splitter;
let noise_splitter;
let left_squares_merger;
let right_squares_merger;
let left_others_merger;
let right_others_merger;
let left_squares_converter;
let right_squares_converter;
let left_others_converter;
let right_others_converter;
let left_merger;
let right_merger;
let left_converter;
let right_converter;
let main_merger;
let audio_ctx;
let sound_enabled = false;
// let audio_merger;

let process_sq1 = true;
let process_sq2 = true;
let process_wave = true;
let process_noise = true;

sound.onclick = function () {
    audio_ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });

    // Create an empty three-second stereo buffer at the sample rate of the AudioContext
    const myArrayBuffer = audio_ctx.createBuffer(2, audio_ctx.sampleRate * 0.25, audio_ctx.sampleRate);
    // audio_merger = audio_ctx.createChannelMerger();
    // audio_merger.connect(audio_ctx.destination);

    square_1_splitter = audio_ctx.createChannelSplitter();
    square_2_splitter = audio_ctx.createChannelSplitter();
    wave_table_splitter = audio_ctx.createChannelSplitter();
    noise_splitter = audio_ctx.createChannelSplitter();

    square_1_toggle = audio_ctx.createGain();
    square_2_toggle = audio_ctx.createGain();
    wave_table_toggle = audio_ctx.createGain();
    noise_toggle = audio_ctx.createGain();

    left_squares_merger = audio_ctx.createChannelMerger(2);
    right_squares_merger = audio_ctx.createChannelMerger(2);
    left_others_merger = audio_ctx.createChannelMerger(2);
    right_others_merger = audio_ctx.createChannelMerger(2);

    left_squares_converter = audio_ctx.createChannelMerger(1);
    right_squares_converter = audio_ctx.createChannelMerger(1);
    left_others_converter = audio_ctx.createChannelMerger(1);
    right_others_converter = audio_ctx.createChannelMerger(1);

    left_merger = audio_ctx.createChannelMerger(2);
    right_merger = audio_ctx.createChannelMerger(2);

    left_converter = audio_ctx.createChannelMerger(1);
    right_converter = audio_ctx.createChannelMerger(1);

    main_merger = audio_ctx.createChannelMerger(2);

    square_1_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
    square_1_toggle.connect(wave_table_splitter);
    square_2_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
    square_2_toggle.connect(wave_table_splitter);
    wave_table_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
    wave_table_toggle.connect(wave_table_splitter);
    noise_toggle.gain.setValueAtTime(1, audio_ctx.currentTime);
    noise_toggle.connect(wave_table_splitter);

    square_1_splitter.connect(left_squares_merger, 0, 0);
    square_1_splitter.connect(right_squares_merger, 1, 0);
    square_2_splitter.connect(left_squares_merger, 0, 1);
    square_2_splitter.connect(right_squares_merger, 1, 1);
    wave_table_splitter.connect(left_others_merger, 0, 0);
    wave_table_splitter.connect(right_others_merger, 1, 0);
    noise_splitter.connect(left_others_merger, 0, 1);
    noise_splitter.connect(right_others_merger, 1, 1);

    left_squares_merger.connect(left_squares_converter);
    right_squares_merger.connect(right_squares_converter);
    left_others_merger.connect(left_others_converter);
    right_others_merger.connect(right_others_converter);

    left_squares_converter.connect(left_merger, 0, 0);
    left_others_converter.connect(left_merger, 0, 1);
    right_squares_converter.connect(right_merger, 0, 0);
    right_others_converter.connect(right_merger, 0, 1);

    left_merger.connect(left_converter);
    right_merger.connect(right_converter);

    left_converter.connect(main_merger, 0, 0);
    right_converter.connect(main_merger, 0, 1);

    main_merger.connect(audio_ctx.destination);

    // Fill the buffer with white noise_gen;
    // just random values between -1.0 and 1.0
    for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
        // This gives us the actual array that contains the data
        const nowBuffering = myArrayBuffer.getChannelData(channel);
        for (let i = 0; i < myArrayBuffer.length; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            // nowBuffering[i] = Math.random() * 2 - 1;
            nowBuffering[i] = Math.sin(i*0.25);
        }
    }

    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    const source = audio_ctx.createBufferSource();

    // set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;

    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(square_1_splitter);

    // start the source playing
    source.start();
    sound_enabled = true;

    TriggerBufferReset(square_1.id, XFF00);
    TriggerBufferReset(square_2.id, XFF00);
    TriggerBufferReset(wave_table.id, XFF00);
    TriggerBufferReset(noise_gen.id, XFF00);
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


let old_time = -1;
let num_of_cycles = 0;
let ms_per_cycle = 4.8e-7;
let full_speed = 2.3866e-7;
let watchdog_ms_per_cycle = 4.8e-7;
let half_ms = true;


let square_1_buffer;
let square_1_buffer_left_data;
let square_1_buffer_right_data;
let square_1_buffer_pos = -1;

let square_2_buffer;
let square_2_buffer_left_data;
let square_2_buffer_right_data;
let square_2_buffer_pos = -1;

let wave_table_buffer;
let wave_table_buffer_left_data;
let wave_table_buffer_right_data;
let wave_table_buffer_pos = -1;

let noise_buffer;
let noise_buffer_left_data;
let noise_buffer_right_data;
let noise_buffer_pos = -1;

let old_xff = [];

class Square_1 {

    constructor() {
        this.old_frequency = 0;
        this.volume = 0;
        this.freq_change = false;

        this.length_counter = 0;
        this.sweep_counter = 0;
        this.shadow_freq = 0;

        this.env_tick = 0;
        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 0;
        this.started = false;
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
    get_starting_volume(XFF) {
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
    set_starting_volume(XFF, value) {
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
};
class Square_2 {

    constructor() {
        this.old_frequency = 0;
        this.volume = 0;
        this.freq_change = false;

        this.length_counter = 0;

        this.env_tick = 0;
        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 1;
        this.started = false;
    }
    get_duty(XFF) {
        return (XFF[0x16] & 0b1100_0000) >> 6;
    }
    get_length_load(XFF) {
        return (XFF[0x16] & 0b0011_1111);
    }
    get_starting_volume(XFF) {
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
    set_starting_volume(XFF, value) {
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
};
let noise_divisors = [8, 16, 32, 48, 64, 80, 96, 112];
class Noise_Gen {

    constructor() {
        this.old_frequency = 0;
        this.volume = 0;
        this.freq_change = false;
        this.lfsr = 0;

        this.length_counter = 0;

        this.clock_tick = 0;

        this.env_tick = 0;
        this.cycles = 0;
        this.clock_shift = 0;
        this.id = 3;
        this.started = false;
    }
    get_length_load(XFF) {
        return (XFF[0x20] & 0b0011_1111);
    }
    get_starting_volume(XFF) {
        return (XFF[0x21] & 0b1111_0000) >> 4;
    }
    get_envelope_mode(XFF) {
        return (XFF[0x21] & 0b0000_1000) >> 3;
    }
    get_envelope_period(XFF) {
        return (XFF[0x21] & 0b0000_0111);
    }
    get_clock_shift(XFF) {
        return (XFF[0x22] & 0b1111_0000) >> 4;
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
    set_starting_volume(XFF, value) {
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
};

let square_1 = new Square_1();
let square_2 = new Square_2();
let wave_table = new Wave_Table();
let noise_gen = new Noise_Gen();

let control = new Control();

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
        return (((XFF[reg_num] & 0xf0) >> 4) >> shift)/15;
    }else {
        return ((XFF[reg_num] & 0x0f) >> shift)/15;
    }
};
function getNoiseGeneratorBlip(XFF) {
    let low_bit = noise_gen.lfsr & 1;
    let new_bit = low_bit ^ ((noise_gen.lfsr & 0b10) >> 1);
    noise_gen.lfsr >>= 1;
    if (new_bit === 0) {
        noise_gen.lfsr |= (1 << 15);
        if (noise_gen.get_width_mode(XFF) === 1) {
            noise_gen.lfsr &= 0b11111111_01111111;
            noise_gen.lfsr |= (1 << 7);
        }
    }
    // speed.innerHTML = "<h3> LFSR: " + noise_gen.lfsr.toString(2).padStart(16, "0") + "</h3>";
    return low_bit;
};

function AddAudioBlip(channel, left_blip, right_blip, XFF) {
    switch (channel) {
        case square_1.id:
            if (square_1_buffer_pos > square_1_buffer_left_data.length) {
                TriggerBufferReset(channel, XFF);
            }
            square_1_buffer_left_data[Math.floor(square_1_buffer_pos)] = left_blip;
            square_1_buffer_right_data[Math.floor(square_1_buffer_pos)] = right_blip;
            if (square_1.time_mod > 1) {
                for (let i = 1; i < square_1.time_mod; i++) {
                    square_1_buffer_left_data[Math.floor(square_1_buffer_pos)+i] = left_blip;
                    square_1_buffer_right_data[Math.floor(square_1_buffer_pos)+i] = right_blip;
                }
            }
            square_1_buffer_pos += square_1.time_mod;
            break;
        case square_2.id:
            if (square_2_buffer_pos > square_2_buffer_left_data.length) {
                TriggerBufferReset(channel, XFF);
            }
            square_2_buffer_left_data[Math.floor(square_2_buffer_pos)] = left_blip;
            square_2_buffer_right_data[Math.floor(square_2_buffer_pos)] = right_blip;
            if (square_2.time_mod > 1) {
                for (let i = 1; i < square_2.time_mod; i++) {
                    square_2_buffer_left_data[Math.floor(square_2_buffer_pos)+i] = left_blip;
                    square_2_buffer_right_data[Math.floor(square_2_buffer_pos)+i] = right_blip;
                }
            }
            square_2_buffer_pos += square_2.time_mod;
            break;
        case wave_table.id:
            if (wave_table_buffer_pos > wave_table_buffer_left_data.length) {
                TriggerBufferReset(channel, XFF);
            }
            wave_table_buffer_left_data[Math.floor(wave_table_buffer_pos)] = left_blip;
            wave_table_buffer_right_data[Math.floor(wave_table_buffer_pos)] = right_blip;
            if (wave_table.time_mod > 1) {
                for (let i = 1; i < wave_table.time_mod; i++) {
                    wave_table_buffer_left_data[Math.floor(wave_table_buffer_pos)+i] = left_blip;
                    wave_table_buffer_right_data[Math.floor(wave_table_buffer_pos)+i] = right_blip;
                }
            }
            wave_table_buffer_pos += wave_table.time_mod;
            break;
        case noise_gen.id:
            if (noise_buffer_pos > noise_buffer_left_data.length) {
                TriggerBufferReset(channel, XFF);
            }
            noise_buffer_left_data[Math.floor(noise_buffer_pos)] = left_blip;
            noise_buffer_right_data[Math.floor(noise_buffer_pos)] = right_blip;
            if (noise_gen.time_mod > 1) {
                for (let i = 1; i < noise_gen.time_mod; i++) {
                    noise_buffer_left_data[Math.floor(noise_buffer_pos)+i] = left_blip;
                    noise_buffer_right_data[Math.floor(noise_buffer_pos)+i] = right_blip;
                }
            }
            noise_buffer_pos += noise_gen.time_mod;
            break;
    }
};

// function generate_data(channel, XFF) {
//     switch (channel) {
//         case square_1.id:
//             for (let i in square_1_buffer_left_data) {
//                 let blip = getSquareWave((i % 8), square_1.get_duty(XFF));
//                 let left_blip = blip*(square_1.volume/15)*((control.get_left_vol(XFF)+1)/8)*control.get_sq1_left(XFF);
//                 let right_blip = blip*(square_1.volume/15)*((control.get_right_vol(XFF)+1)/8)*control.get_sq1_right(XFF);
//                 AddAudioBlip(square_1.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
//             }
//         case square_2.id:
//             for (let i in square_2_buffer_left_data) {
//                 let blip = getSquareWave((i % 8), square_2.get_duty(XFF));
//                 let left_blip = blip*(square_2.volume/15)*((control.get_left_vol(XFF)+1)/8)*control.get_sq2_left(XFF);
//                 let right_blip = blip*(square_2.volume/15)*((control.get_right_vol(XFF)+1)/8)*control.get_sq2_right(XFF);
//                 AddAudioBlip(square_2.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
//             }
//         case wave_table.id:
//             for (let i in wave_table_buffer_left_data) {
//                 let blip = getWaveTableWave(i, XFF);
//                 let left_blip = blip*((control.get_left_vol(XFF)+1)/8)*control.get_wav_left(XFF)*4;
//                 let right_blip = blip*((control.get_right_vol(XFF)+1)/8)*control.get_wav_right(XFF)*4;
//                 AddAudioBlip(wave_table.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
//             }
//     }
// };

function TriggerBufferReset(channel, XFF) {
    switch (channel) {
        case square_1.id:
            // let freq = square_1.get_frequency(XFF);
            // if (freq === 0) {
            //     freq = 2048;
            // }
            square_1.time_mod = 1;
            // let hz = 1000/(((2048-square_1.get_frequency(XFF))*4)*ms_per_cycle);
            // let hz = 4194304/freq;
            // hz *= (full_speed/ms_per_cycle)*0.97;
            let hz = 1048576/(2048-square_1.get_frequency(XFF));
            // console.log(hz);
            // console.log(square_1.time_mod);
            // Square 1 always runs at 48000 when sweep is enabled, accounted for at AddAudioBlip, because of frequency constantly changing
            if (square_1.get_sweep_period(XFF) !== 0 && square_1.get_shift(XFF) === 0) {
                square_1_buffer = audio_ctx.createBuffer(2, 48000*2, 48000);
                square_1.time_mod = 48000/hz;
            }else {
                if (hz > 96000) {
                    square_1.time_mod = 0.5;
                    while (hz*square_1.time_mod > 96000) {
                        square_1.time_mod *= 0.5;
                        // square_1.time_mod *= 0.6; // Not *=0.5 so it does not do odd things to waves
                    }
                }else if (hz < 8000) {
                    square_1.time_mod = 2;
                    while (hz*square_1.time_mod < 8000) {
                        square_1.time_mod += 1;
                    }
                }
                square_1_buffer = audio_ctx.createBuffer(2, Math.round(hz*square_1.time_mod*2), Math.round(hz*square_1.time_mod));
            }
            square_1_buffer_left_data = square_1_buffer.getChannelData(0);
            square_1_buffer_right_data = square_1_buffer.getChannelData(1);
            square_1_buffer_pos = 0;
            square_1.freq_change = false;
            square_1.started = false;
            break;
        case square_2.id:
            // let freq2 = square_2.get_frequency(XFF);
            // if (freq2 === 0) {
            //     freq2 = 2048;
            // }
            square_2.time_mod = 1;
            // let hz2 = 1000/(((2048-square_2.get_frequency(XFF))*4)*ms_per_cycle);
            // let hz2 = 4194304/freq2;
            let hz2 = 1048576/(2048-square_2.get_frequency(XFF));
            // hz2 *= (full_speed/ms_per_cycle)*0.97;
            // console.log(hz2);
            if (hz2 > 96000) {
                square_2.time_mod = 0.5; // Not 0.5 so it does not do odd things to waves
                while ((hz2)*square_2.time_mod > 96000) {
                    square_2.time_mod *= 0.5;
                    // square_2.time_mod *= 0.6; // Not *=0.5 so it does not do odd things to waves
                }
            }else if (hz2 < 8000) {
                square_2.time_mod = 2;
                while (hz2*square_2.time_mod < 8000) {
                    square_2.time_mod += 1;
                }
            }
            // console.log(square_2.time_mod);
            square_2_buffer = audio_ctx.createBuffer(2, Math.round(hz2*square_2.time_mod*2), Math.round(hz2*square_2.time_mod));
            square_2_buffer_left_data = square_2_buffer.getChannelData(0);
            square_2_buffer_right_data = square_2_buffer.getChannelData(1);
            square_2_buffer_pos = 0;
            square_2.freq_change = false;
            square_2.started = false;
            break;
        case wave_table.id:
            // let freq3 = wave_table.get_frequency(XFF);
            // if (freq3 === 0) {
            //     freq3 = 2048;
            // }
            wave_table.time_mod = 1;
            // let hz3 = 1000/(((2048-wave_table.get_frequency(XFF))*4)*ms_per_cycle);
            // let hz3 = 4194304/freq3*2;
            let hz3 = 2097152/(2048-wave_table.get_frequency(XFF));
            // hz3 *= (full_speed/ms_per_cycle)*0.97;
            if (hz3 > 96000) {
                wave_table.time_mod = 0.5; // Not 0.5 so it does not do odd things to waves
                while ((hz3)*wave_table.time_mod > 96000) {
                    wave_table.time_mod *= 0.5;
                    // wave_table.time_mod *= 0.6; // Not o=0.5 so it does not do odd things to waves
                }
            }else if (hz3 < 8000) {
                wave_table.time_mod = 2;
                while (hz3*wave_table.time_mod < 8000) {
                    wave_table.time_mod += 1;
                }
            }
            wave_table_buffer = audio_ctx.createBuffer(2, Math.round(hz3*wave_table.time_mod*2), Math.round(hz3*wave_table.time_mod));
            wave_table_buffer_left_data = wave_table_buffer.getChannelData(0);
            wave_table_buffer_right_data = wave_table_buffer.getChannelData(1);
            wave_table_buffer_pos = 0;
            wave_table.freq_change = false;
            wave_table.started = false;
            break;
        case noise_gen.id:
            
            noise_gen.time_mod = 1;
            // let hz4 = (524288/Math.max(noise_gen.get_divisor_code(XFF), 0.5))/Math.pow(2, noise_gen.get_clock_shift(XFF)+1);
            let hz4 = 4194304/(noise_gen.get_divisor(XFF) << noise_gen.get_clock_shift(XFF));
            console.log(hz4);
            
            // hz4 *= (full_speed/ms_per_cycle)*0.97;
            if (hz4 > 96000) {
                noise_gen.time_mod = 0.6; // Not 0.5 so it does not do odd things to waves
                while ((hz4)*noise_gen.time_mod > 96000) {
                    noise_gen.time_mod *= 0.6;
                    // noise_gen.time_mod *= 0.6; // Not o=0.5 so it does not do odd things to waves
                }
            }else if (hz4 < 8000) {
                noise_gen.time_mod = 2;
                while (hz4*noise_gen.time_mod < 8000) {
                    noise_gen.time_mod += 1;
                }
            }
            console.log(noise_gen.time_mod);
            
            noise_buffer = audio_ctx.createBuffer(2, Math.round(hz4*noise_gen.time_mod*2), Math.round(hz4*noise_gen.time_mod));
            noise_buffer_left_data = noise_buffer.getChannelData(0);
            noise_buffer_right_data = noise_buffer.getChannelData(1);
            
            noise_buffer_pos = 0;
            noise_gen.freq_change = false;
            
            noise_gen.started = false;
            noise_gen.lfsr = 0;
            
            // console.log(noise_gen.volume, "QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ");
            console.log("LOOK AT MEEEEEEEEEEEE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            
            break;
    }
};

function TriggerAudioChannel(channel, XFF) {
    switch (channel) {
        case square_1.id:
            try {
                square_1_source_node.disconnect();
            }
            catch (err) {}
            console.log("SqWv1 Audio Setup, frequency: "+square_1.get_frequency(XFF)+", duty: "+square_1.get_duty(XFF));
            square_1_source_node = audio_ctx.createBufferSource();
            square_1_source_node.buffer = square_1_buffer;
            // square_1_source_node.connect(audio_merger);
            // square_1_source_node.connect(audio_ctx.destination);
            square_1_source_node.connect(square_1_toggle);
            square_1_source_node.start();
            square_1.started = true;
            break;
        case square_2.id:
            try {
                square_2_source_node.disconnect();
            }
            catch (err) {}
            console.log("SqWv2 Audio Setup, frequency: "+square_2.get_frequency(XFF)+", duty: "+square_2.get_duty(XFF));
            square_2_source_node = audio_ctx.createBufferSource();
            square_2_source_node.buffer = square_2_buffer;
            // square_2_source_node.connect(audio_merger);
            // square_2_source_node.connect(audio_ctx.destination);
            square_2_source_node.connect(square_2_toggle);
            square_2_source_node.start();
            square_2.started = true;
            break;
        case wave_table.id:
            try {
                wave_table_source_node.disconnect();
            }
            catch (err) {}
            console.log("WvTbl Audio Setup, frequency: "+wave_table.get_frequency(XFF));
            wave_table_source_node = audio_ctx.createBufferSource();
            wave_table_source_node.buffer = wave_table_buffer;
            // wave_table_source_node.connect(audio_merger);
            // wave_table_source_node.connect(audio_ctx.destination);
            wave_table_source_node.connect(wave_table_toggle);
            wave_table_source_node.start();
            wave_table.started = true;
            break;
        case noise_gen.id:
            try {
                noise_source_node.disconnect();
            }
            catch (err) {}
            console.log("Noise Audio Setup");
            noise_source_node = audio_ctx.createBufferSource();
            noise_source_node.buffer = noise_buffer;
            // noise_source_node.connect(audio_merger);
            // noise_source_node.connect(audio_ctx.destination);
            noise_source_node.connect(noise_toggle);
            noise_source_node.start();
            noise_gen.started = true;
            console.log(noise_buffer_left_data);
            console.log(noise_buffer_right_data);
            console.log("LOOK HEREEEEEEEEEEEEE??????????????????????????????????????????????????????????????????????????????");
            break;
    }
};

// function TriggerBufferFreqChange(channel, XFF) {
//     if (channel === square_1.id) {
//         let freq = square_1.get_frequency(XFF);
//         if (freq === 0) {
//             freq = 2048;
//         }
//         square_1.time_mod = 1;
//         let hz = 1048576/(2048-square_1.get_frequency(XFF));
//         if (hz > 96000) {
//             square_1.time_mod = 0.5;
//             while (hz*square_1.time_mod > 96000) {
//                 square_1.time_mod *= 0.5;
//             }
//         }else if (hz < 8000) {
//             square_1.time_mod = 2;
//             while (hz*square_1.time_mod < 8000) {
//                 square_1.time_mod += 1;
//             }
//         }
//         let new_buffer = audio_ctx.createBuffer(2, hz*square_1.time_mod*8, hz*square_1.time_mod);
//         let new_left = new_buffer.getChannelData(0);
//         let new_right = new_buffer.getChannelData(0);
//         for (let i = Math.max(square_1_buffer_pos-100, 0); i < Math.min(new_left.length, square_1_buffer_left_data.length, square_1_buffer_pos); i++) {
//             let j = 0;
//             new_left[j] = square_1_buffer_left_data[i];
//             new_right[j] = square_1_buffer_right_data[i];
//             j++;
//         }
//         square_1_buffer = new_buffer;
//         square_1_buffer_left_data = new_left;
//         square_1_buffer_right_data = new_right;
//         TriggerAudioChannel(square_1.id, XFF);
//         square_1.freq_change = false;
//     }
// };

// let power_reset_values = [
//     0x80, 0xbf, 0xf3, 0xff, 0xbf,
//     0xff, 0x3f, 0x00, 0xff, 0xbf,
//     0x7f, 0xff, 0x9f, 0xff, 0xbf,
//     0xff, 0xff, 0x00, 0x00, 0xbf,
//     0x77, 0xf3
// ];
function reload_channel(channel, XFF) {
    switch (channel) {
        case square_1.id:
            TriggerBufferReset(square_1.id, XFF);
            square_1.volume = square_1.get_starting_volume(XFF);
            square_1.length_counter = square_1.get_length_load(XFF);
            square_1.sweep_counter = square_1.get_sweep_period(XFF);
            square_1.shadow_freq = square_1.get_frequency(XFF);
        case square_2.id:
            TriggerBufferReset(square_2.id, XFF);
            square_2.volume = square_2.get_starting_volume(XFF);
            square_2.length_counter = square_2.get_length_load(XFF);
        case wave_table.id:
            TriggerBufferReset(wave_table.id, XFF);
            wave_table.length_counter = wave_table.get_length_load(XFF);
        case noise_gen.id:
            TriggerBufferReset(noise_gen.id, XFF);
            noise_gen.volume = noise_gen.get_starting_volume(XFF);
            noise_gen.length_counter = noise_gen.get_length_load(XFF);
            noise_gen.lfsr = 0;
    }
}
function load_xff(XFF) {
    if (XFF[0x13] !== old_xff[0x13]) {
        if (square_1.get_frequency(XFF) !== square_1.old_frequency) {
            square_1.old_frequency = square_1.get_frequency(XFF);
            square_1.freq_change = true;
            reload_channel(square_1.id, XFF);
        }
    }
    if (XFF[0x14] !== old_xff[0x14] || square_1_enable_written) {
        if (square_1.get_frequency(XFF) !== square_1.old_frequency) {
            square_1.old_frequency = square_1.get_frequency(XFF);
            square_1.freq_change = true;
            reload_channel(square_1.id, XFF);
        }
        if (square_1.get_enable(XFF) === 1) {
            reload_channel(square_1.id, XFF);
        }
        square_1_enable_written = false;
    }
    if (XFF[0x18] !== old_xff[0x18]) {
        if (square_2.get_frequency(XFF) !== square_2.old_frequency) {
            square_2.old_frequency = square_2.get_frequency(XFF);
            square_2.freq_change = true;
            reload_channel(square_2.id, XFF);
        }
    }
    if (XFF[0x19] !== old_xff[0x19] || square_2_enable_written) {
        if (square_2.get_frequency(XFF) !== square_2.old_frequency) {
            square_2.old_frequency = square_2.get_frequency(XFF);
            square_2.freq_change = true;
            reload_channel(square_2.id, XFF);
        }
        if (square_2.get_enable(XFF) === 1) {
            reload_channel(square_2.id, XFF);
        }
        square_2_enable_written = false;
    }
    if (XFF[0x1D] !== old_xff[0x1D]) {
        if (wave_table.get_frequency(XFF) !== wave_table.old_frequency) {
            wave_table.old_frequency = wave_table.get_frequency(XFF);
            wave_table.freq_change = true;
            reload_channel(wave_table.id, XFF);
        }
    }
    if (XFF[0x1E] !== old_xff[0x1E] || wave_table_enable_written) {
        if (wave_table.get_frequency(XFF) !== wave_table.old_frequency) {
            wave_table.old_frequency = wave_table.get_frequency(XFF);
            wave_table.freq_change = true;
            reload_channel(wave_table.id, XFF);
        }
        if (wave_table.get_enable(XFF) === 1) {
            reload_channel(wave_table.id, XFF);
        }
        wave_table_enable_written = false;
    }
    if (XFF[0x23] !== old_xff[0x23] || noise_enable_written) {
        if (wave_table.get_enable(XFF) === 1) {
            reload_channel(noise_gen.id, XFF);
        }
        noise_enable_written = false;
    }
    old_xff = Array.from(XFF);
};


let store_cycles = 0;
let cycle_cuttoff = 7000000; // just under 100 frames
let watchdog_cuttoff = 1000000; // just under 100 frames

let initial_buffer = 200;
let old_time_precise = 0;

let sound_by_ms = true; // system ms vs CPU cycles

function channel_clocker(cycles, XFF) {
    if (XFF !== old_xff) {
        load_xff(XFF);
    }
    if (sound_enabled) {

        if (old_time !== -1) {
            store_cycles += cycles;
            if (old_time !== Math.floor(audio_ctx.currentTime)) {
                if (!half_ms) {
                    watchdog_ms_per_cycle = 1/store_cycles;
                    ms_per_cycle = (ms_per_cycle*0.9)+(1/store_cycles*0.1);

                    if (ms_per_cycle/watchdog_ms_per_cycle < 0.90 || ms_per_cycle/watchdog_ms_per_cycle > 1.10) {
                        ms_per_cycle = watchdog_ms_per_cycle;
                        console.log("Watchdog!");
                    }
                    
                    speed.innerHTML = "<h3> Speed: " + (Math.round(full_speed/ms_per_cycle*100)) + "%</h3>" + "<h3> (Watchdog): " + (Math.round(full_speed/watchdog_ms_per_cycle*100)) + "%</h3>";
                }else {
                    half_ms = false;
                }
                store_cycles = 0;
                old_time = Math.floor(audio_ctx.currentTime);
            }
            // if (store_cycles > 1000) {
            //     let time_now = audio_ctx.currentTime;
            //     // ms_per_cycle = ((ms_per_cycle*num_of_cycles)+(time_now-old_time))/(num_of_cycles+store_cycles);
            //     ms_per_cycle = ((ms_per_cycle*(cycle_cuttoff-1000))+(time_now-old_time))/(cycle_cuttoff);
            //     watchdog_ms_per_cycle = ((watchdog_ms_per_cycle*(watchdog_cuttoff-1000))+(time_now-old_time))/(watchdog_cuttoff);
            //     // num_of_cycles += store_cycles;
            //     old_time = time_now;
            //     store_cycles -= 1000;

            //     if (ms_per_cycle/watchdog_ms_per_cycle < 0.90) {
            //         ms_per_cycle = watchdog_ms_per_cycle;
            //         speed.innerHTML = "<h3> !! Speed: " + (Math.round(full_speed/ms_per_cycle*100)) + "% !!</h3>";
            //         console.log("Slowing down!");
            //     }

            //     num_of_cycles += store_cycles;
            //     if (num_of_cycles > 40000) {
            //         num_of_cycles -= 40000;
            //         speed.innerHTML = "<h3> Speed: " + (Math.round(full_speed/ms_per_cycle*100)) + "%</h3>";
            //     }
            // }
        }else {
            old_time = audio_ctx.currentTime;
        }

        if (sound_by_ms) {
            if (old_time_precise !== 0) {
                cycles = (audio_ctx.currentTime-old_time_precise)*(1/full_speed)*1.05;
            }
            old_time_precise = audio_ctx.currentTime;
        }else {
            // Generate sound faster when running slow so that frequencies
            // do not change.
            cycles *= (ms_per_cycle/full_speed)*1.05;
        }

        // Square Wave 1
        if (process_sq1) {
            square_1.cycles += cycles;
            while (square_1.cycles > (2048-square_1.get_frequency(XFF))*4) {
                square_1.cycles -= (2048-square_1.get_frequency(XFF))*4;
                square_1.clock_tick += 1;
                square_1.clock_tick &= 0b111;

                // Remap to -1, 1
                if (control.get_enable(XFF) === 1 && square_1.get_enable(XFF) === 1) {
                    let blip = getSquareWave(square_1.clock_tick, square_1.get_duty(XFF));
                    let left_blip = blip*(square_1.volume/15)*((control.get_left_vol(XFF)+1)/8)*control.get_sq1_left(XFF);
                    let right_blip = blip*(square_1.volume/15)*((control.get_right_vol(XFF)+1)/8)*control.get_sq1_right(XFF);
                    AddAudioBlip(square_1.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                }else {
                    // console.log("SqWv1 Disabled");
                    AddAudioBlip(square_1.id, 0, 0, XFF);
                }
                if (square_1_buffer_pos >= initial_buffer && !square_1.started) {
                    TriggerAudioChannel(square_1.id, XFF);
                }
            }
        }

        // Square Wave 2
        if (process_sq2) {
            square_2.cycles += cycles;
            while (square_2.cycles > (2048-square_2.get_frequency(XFF))*4) {
                square_2.cycles -= (2048-square_2.get_frequency(XFF))*4;
                square_2.clock_tick += 1;
                square_2.clock_tick &= 0b111;

                // Remap to -1, 1
                if (control.get_enable(XFF) === 1 && square_2.get_enable(XFF) === 1) {
                    let blip = getSquareWave(square_2.clock_tick, square_2.get_duty(XFF));
                    let left_blip = blip*(square_2.volume/15)*((control.get_left_vol(XFF)+1)/8)*control.get_sq2_left(XFF);
                    let right_blip = blip*(square_2.volume/15)*((control.get_right_vol(XFF)+1)/8)*control.get_sq2_right(XFF);
                    AddAudioBlip(square_2.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                }else {
                    // console.log("SqWv2 Disabled");
                    AddAudioBlip(square_2.id, 0, 0, XFF);
                }
                if (square_2_buffer_pos >= initial_buffer && !square_2.started) {
                    TriggerAudioChannel(square_2.id, XFF);
                }
            }
        }
        
        // Wave Table
        if (process_wave) {
            wave_table.cycles += cycles;
            while (wave_table.cycles > (2048-wave_table.get_frequency(XFF))*2) {
                wave_table.cycles -= (2048-wave_table.get_frequency(XFF))*2;
                wave_table.clock_tick += 1;
                wave_table.clock_tick &= 0b1_1111;

                // Remap to -1, 1
                if (control.get_enable(XFF) === 1 && wave_table.get_enable(XFF) === 1 && wave_table.get_dac_power(XFF) === 1) {
                    let blip = getWaveTableWave(wave_table.clock_tick, XFF);
                    let left_blip = blip*((control.get_left_vol(XFF)+1)/8)*control.get_wav_left(XFF);
                    let right_blip = blip*((control.get_right_vol(XFF)+1)/8)*control.get_wav_right(XFF);
                    AddAudioBlip(wave_table.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                }else {
                    AddAudioBlip(wave_table.id, 0, 0, XFF);
                }
                if (wave_table_buffer_pos >= initial_buffer*2 && !wave_table.started) {
                    TriggerAudioChannel(wave_table.id, XFF);
                }
            }
        }
        
        // Noise Generator
        if (process_noise) {
            noise_gen.cycles += cycles;
            while (noise_gen.cycles > (noise_gen.get_divisor(XFF) << noise_gen.get_clock_shift(XFF))) {
                noise_gen.cycles -= (noise_gen.get_divisor(XFF) << noise_gen.get_clock_shift(XFF));
                // noise_gen.cycles -= (noise_gen.get_divisor_code(XFF)+1)*2;
                // noise_gen.clock_tick -= 1;
                
                // if (noise_gen.clock_tick <= 0) {
                // noise_gen.clock_tick = 1 << (noise_gen.get_clock_shift(XFF)+1);

                // Remap to -1, 1
                if (control.get_enable(XFF) === 1 && noise_gen.get_enable(XFF) === 1) {
                    let blip = getNoiseGeneratorBlip(XFF);
                    // noise_gen.volume = 7;
                    // if (!control.get_noi_left(XFF) || !control.get_noi_right(XFF)) {
                    //     alert("Disabled");
                    // }
                    let left_blip = blip*(noise_gen.volume/15)*((control.get_left_vol(XFF)+1)/8)*control.get_noi_left(XFF);
                    let right_blip = blip*(noise_gen.volume/15)*((control.get_right_vol(XFF)+1)/8)*control.get_noi_right(XFF);
                    if (noise_gen.volume !== 0) {
                        // console.log(noise_gen.volume, "QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ");
                    }
                    if (noise_gen.get_starting_volume(XFF) !== 0) {
                        // console.log(noise_gen.get_starting_volume(XFF), "QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ");
                    }
                    // 
                    // console.log(blip, left_blip, right_blip);
                    // console.log(blip, noise_gen.volume, control.get_left_vol(XFF), control.get_noi_left(XFF));
                    // console.log(blip, noise_gen.volume, control.get_right_vol(XFF), control.get_noi_right(XFF));
                    AddAudioBlip(noise_gen.id, (left_blip*-2)+1, (right_blip*-2)+1, XFF);
                }else {
                    AddAudioBlip(noise_gen.id, 0, 0, XFF);
                }
                if (noise_buffer_pos >= initial_buffer && !noise_gen.started) {
                    TriggerAudioChannel(noise_gen.id, XFF);
                }
                // }
            }
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
    if (square_1.get_enable(XFF) === 1 && square_1.get_length_enable(XFF) === 1 && process_sq1) {
        square_1.length_counter += 1;
        if (square_1.length_counter >= 64) {
            XFF = square_1.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                console.log("SqWv1 Length counter triggered ------- SHUT OFF");
            // }
            length = 0;
        }
        // console.log("SqWv1 Length counter triggered");
    }
    //Square Wave 2
    if (square_2.get_enable(XFF) === 1 && square_2.get_length_enable(XFF) === 1 && process_sq2) {
        square_2.length_counter += 1;
        if (square_2.length_counter >= 64) {
            XFF = square_2.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                console.log("SqWv2 Length counter triggered shut off " + length);
            // }
        }
        // console.log("SqWv2 Length counter triggered");
    }
    //Wave Table
    if (wave_table.get_enable(XFF) === 1 && wave_table.get_length_enable(XFF) === 1 && process_wave) {
        wave_table.length_counter += 1;
        if (wave_table.length_counter >= 256) {
            XFF = wave_table.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                console.log("WvTbl Length counter triggered shut off " + length);
            // }
        }
        // console.log("WvTbl Length counter triggered: length " + length);
    }
    //Noise Generator
    if (noise_gen.get_enable(XFF) === 1 && noise_gen.get_length_enable(XFF) === 1 && process_noise) {
        noise_gen.length_counter += 1;
        if (noise_gen.length_counter >= 64) {
            XFF = noise_gen.set_enable(XFF, 0);
            // if (dump_instr === 1) {
                console.log("NsGen Length counter triggered shut off " + length);
                console.log(noise_buffer_pos);
            // }
        }
        // console.log("NsGen Length counter triggered: length " + length);
    }

    return XFF;
};

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
                    console.log("SqWv1 Disabled: Sweep");
                // }
            }
            let freq = square_1.shadow_freq;
            // let freq = square_1.get_frequency(XFF);
            if (square_1.get_shift(XFF) !== 0) {
                let shadow_freq = freq >> square_1.get_shift(XFF);
                if (square_1.get_negate_shift(XFF) === 1) {
                    shadow_freq *= -1;
                }
                freq += shadow_freq;
                if (freq > 2047) {
                    XFF = square_1.set_enable(XFF, 0);
                    console.log("SqWv1 Disabled: Sweep");
                } else {
                    XFF = square_1.set_frequency(XFF, freq);
                }
                square_1.shadow_freq = freq;
                let hz = 1048576/(2048-freq);
                square_1.time_mod = 48000/hz;
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
    if (square_1.get_enable(XFF) === 1 && process_sq1) {
        square_1.env_tick += 1;
        if (square_1.env_tick > square_1.get_envelope_period(XFF) && square_1.get_envelope_period(XFF) !== 0) {
            square_1.env_tick = 0;
            if (square_1.get_envelope_mode(XFF) === 0) {
                square_1.volume -= 1;
                if (square_1.volume < 0) {
                    square_1.volume = 0;
                    XFF = square_1.set_enable(XFF, 0);
                }
            }else {
                square_1.volume += 1;
                square_1.volume &= 0b1111;
            }
        }
    }

    // Square Wave 2
    if (square_2.get_enable(XFF) === 1 && process_sq2) {
        square_2.env_tick += 1;
        if (square_2.env_tick > square_2.get_envelope_period(XFF) && square_2.get_envelope_period(XFF) !== 0) {
            square_2.env_tick = 0;
            if (square_2.get_envelope_mode(XFF) === 0) {
                square_2.volume -= 1;
                if (square_2.volume < 0) {
                    square_2.volume = 0;
                    XFF = square_2.set_enable(XFF, 0);
                }
            }else {
                square_2.volume += 1;
                square_2.volume &= 0b1111;
            }
        }
    }

    // Noise Generator
    if (noise_gen.get_enable(XFF) === 1 && process_noise) {
        noise_gen.env_tick += 1;
        if (noise_gen.env_tick > noise_gen.get_envelope_period(XFF) && noise_gen.get_envelope_period(XFF) !== 0) {
            noise_gen.env_tick = 0;
            if (noise_gen.get_envelope_mode(XFF) === 0) {
                noise_gen.volume -= 1;
                if (noise_gen.volume < 0) {
                    noise_gen.volume = 0;
                    XFF = noise_gen.set_enable(XFF, 0);
                }
            }else {
                noise_gen.volume += 1;
                noise_gen.volume &= 0b1111;
            }
        }
    }

    return XFF;
};

function frame_sequencer(XFF) {
    if (XFF !== old_xff) {
        load_xff(XFF);
    }
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
    half_ms = true;
};