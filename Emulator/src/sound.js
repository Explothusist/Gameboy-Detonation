
let sound = document.getElementById("sound");
let speed = document.getElementById("speed");

let audio_ctx;
let sound_enabled = false;
let audio_merger;

sound.onclick = function () {
    audio_ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });

    // Create an empty three-second stereo buffer at the sample rate of the AudioContext
    const myArrayBuffer = audio_ctx.createBuffer(2, audio_ctx.sampleRate * 0.25, audio_ctx.sampleRate);
    audio_merger = audio_ctx.createChannelMerger(4);
    audio_merger.connect(audio_ctx.destination);

    // Fill the buffer with white noise;
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
    source.connect(audio_merger);

    // start the source playing
    source.start();
    sound_enabled = true;

    TriggerBufferReset(square_1.id);
    TriggerBufferReset(square_2.id);
    TriggerBufferReset(wave_table.id);
    speed.innerHTML = "<h3> Speed: " + (Math.round(full_speed/ms_per_cycle*100)) + "%</h3>";
};


let old_time = -1;
let num_of_cycles = 0;
let ms_per_cycle = 4.8e-7;
let full_speed = 2.3866e-7;
let watchdog_ms_per_cycle = 4.8e-7;
let half_ms = true;


let square_1_source_node;
let square_1_buffer;
let square_1_buffer_left_data;
let square_1_buffer_right_data;
let square_1_buffer_pos = -1;

let square_2_source_node;
let square_2_buffer;
let square_2_buffer_left_data;
let square_2_buffer_right_data;
let square_2_buffer_pos = -1;

let wave_table_source_node;
let wave_table_buffer;
let wave_table_buffer_left_data;
let wave_table_buffer_right_data;
let wave_table_buffer_pos = -1;

let old_xff = [];

let square_1 = {
    sweep_period: 0,
    negate_shift: 0,
    shift: 0,
    duty: 0,
    length_load: 0,
    starting_volume: 0,
    volume: 0,
    envelope_mode: 0,
    envelope_period: 0,
    frequency: 0,
    enable: 0,
    length_enable: 0,
    freq_change: false,

    env_tick: 0,

    cycles: 0,
    clock_tick: 0,
    id: 0,
    started: false
};
let square_2 = {
    duty: 0,
    length_load: 0,
    starting_volume: 0,
    volume: 0,
    envelope_mode: 0,
    envelope_period: 0,
    frequency: 0,
    enable: 0,
    length_enable: 0,
    freq_change: false,

    env_tick: 0,

    cycles: 0,
    clock_tick: 0,
    id: 1,
    started: false
};
let wave_table = {
    dac_power: 0,
    length_load: 0,
    volume: 0,
    period: 0,
    frequency: 0,
    enable: 0,
    length_enable: 0,
    freq_change: false,

    cycles: 0,
    clock_tick: 0,
    id: 2,
    started: false
};

let control = {
    left_vol: 0,
    right_vol: 0,
    noi_left: 0,
    wav_left: 0,
    sq2_left: 0,
    sq1_left: 0,
    noi_right: 0,
    wav_right: 0,
    sq2_right: 0,
    sq1_right: 0,
    enable: 0,
    noi_enable: 0,
    wav_enable: 0,
    sq2_enable: 0,
    sq1_enable: 0
};

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
    if (tick % 2 === 0) {
        return (((XFF[reg_num] & 0xf0) >> 4) >> wave_table.volume)/15;
    }else {
        return ((XFF[reg_num] & 0x0f) >> wave_table.volume)/15;
    }
};

function AddAudioBlip(channel, left_blip, right_blip) {
    switch (channel) {
        case square_1.id:
            if (square_1_buffer_pos > square_1_buffer_left_data.length) {
                TriggerBufferReset(channel);
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
                TriggerBufferReset(channel);
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
                TriggerBufferReset(channel);
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
    }
};

function generate_data(channel, XFF) {
    switch (channel) {
        case square_1.id:
            for (let i in square_1_buffer_left_data) {
                let blip = getSquareWave((i % 8), square_1.duty);
                let left_blip = blip*(square_1.volume/15)*((control.left_vol+1)/8)*control.sq1_left;
                let right_blip = blip*(square_1.volume/15)*((control.right_vol+1)/8)*control.sq1_right;
                AddAudioBlip(square_1.id, (left_blip*2)-1, (right_blip*2)-1);
            }
        case square_2.id:
            for (let i in square_2_buffer_left_data) {
                let blip = getSquareWave((i % 8), square_2.duty);
                let left_blip = blip*(square_2.volume/15)*((control.left_vol+1)/8)*control.sq2_left;
                let right_blip = blip*(square_2.volume/15)*((control.right_vol+1)/8)*control.sq2_right;
                AddAudioBlip(square_2.id, (left_blip*2)-1, (right_blip*2)-1);
            }
        case wave_table.id:
            for (let i in wave_table_buffer_left_data) {
                let blip = getWaveTableWave(i, XFF);
                let left_blip = blip*((control.left_vol+1)/8)*control.wav_left*4;
                let right_blip = blip*((control.right_vol+1)/8)*control.wav_right*4;
                AddAudioBlip(wave_table.id, (left_blip*2)-1, (right_blip*2)-1);
            }
    }
};

function TriggerBufferReset(channel) {
    switch (channel) {
        case square_1.id:
            let freq = square_1.frequency;
            if (freq === 0) {
                freq = 2048;
            }
            square_1.time_mod = 1;
            // let hz = 1000/(((2048-square_1.frequency)*4)*ms_per_cycle);
            // let hz = 4194304/freq;
            let hz = 1048576/(2048-square_1.frequency);
            // hz *= (full_speed/ms_per_cycle)*0.97;
            if (hz > 96000) {
                square_1.time_mod = 0.5;
                while (hz*square_1.time_mod > 96000) {
                    square_1.time_mod *= 0.5;
                }
            }else if (hz < 8000) {
                square_1.time_mod = 2;
                while (hz*square_1.time_mod < 8000) {
                    square_1.time_mod += 1;
                }
            }
            square_1_buffer = audio_ctx.createBuffer(2, hz*square_1.time_mod*8, hz*square_1.time_mod);
            square_1_buffer_left_data = square_1_buffer.getChannelData(0);
            square_1_buffer_right_data = square_1_buffer.getChannelData(1);
            square_1_buffer_pos = 0;
            square_1.freq_change = false;
            square_1.started = false;
            break;
        case square_2.id:
            let freq2 = square_2.frequency;
            if (freq2 === 0) {
                freq2 = 2048;
            }
            square_2.time_mod = 1;
            // let hz2 = 1000/(((2048-square_2.frequency)*4)*ms_per_cycle);
            // let hz2 = 4194304/freq2;
            let hz2 = 1048576/(2048-square_2.frequency);
            // hz2 *= (full_speed/ms_per_cycle)*0.97;
            if (hz2 > 96000) {
                square_2.time_mod = 0.6; // Not 0.5 so it does not do odd things to waves
                while ((hz2)*square_2.time_mod > 96000) {
                    square_2.time_mod *= 0.6; // Not o=0.5 so it does not do odd things to waves
                }
            }else if (hz2 < 8000) {
                square_2.time_mod = 2;
                while (hz2*square_2.time_mod < 8000) {
                    square_2.time_mod += 1;
                }
            }
            square_2_buffer = audio_ctx.createBuffer(2, hz2*square_2.time_mod*8, hz2*square_2.time_mod);
            square_2_buffer_left_data = square_2_buffer.getChannelData(0);
            square_2_buffer_right_data = square_2_buffer.getChannelData(1);
            square_2_buffer_pos = 0;
            square_2.freq_change = false;
            square_2.started = false;
            break;
        case wave_table.id:
            let freq3 = wave_table.frequency;
            if (freq3 === 0) {
                freq3 = 2048;
            }
            wave_table.time_mod = 1;
            // let hz3 = 1000/(((2048-wave_table.frequency)*4)*ms_per_cycle);
            // let hz3 = 4194304/freq3*2;
            let hz3 = 2097152/(2048-wave_table.frequency);
            // hz3 *= (full_speed/ms_per_cycle)*0.97;
            if (hz3 > 96000) {
                wave_table.time_mod = 0.6; // Not 0.5 so it does not do odd things to waves
                while ((hz3)*wave_table.time_mod > 96000) {
                    wave_table.time_mod *= 0.6; // Not o=0.5 so it does not do odd things to waves
                }
            }else if (hz3 < 8000) {
                wave_table.time_mod = 2;
                while (hz3*wave_table.time_mod < 8000) {
                    wave_table.time_mod += 1;
                }
            }
            wave_table_buffer = audio_ctx.createBuffer(2, hz3*wave_table.time_mod*8, hz3*wave_table.time_mod);
            wave_table_buffer_left_data = wave_table_buffer.getChannelData(0);
            wave_table_buffer_right_data = wave_table_buffer.getChannelData(1);
            wave_table_buffer_pos = 0;
            wave_table.freq_change = false;
            wave_table.started = false;
            break;
    }
};

function TriggerAudioChannel(channel) {
    switch (channel) {
        case square_1.id:
            try {
                square_1_source_node.disconnect();
            }
            catch (err) {}
            console.log("SqWv1 Audio Setup, frequency: "+square_1.frequency+", duty: "+square_1.duty);
            square_1_source_node = audio_ctx.createBufferSource();
            square_1_source_node.buffer = square_1_buffer;
            square_1_source_node.connect(audio_merger);
            square_1_source_node.start();
            square_1.started = true;
            break;
        case square_2.id:
            try {
                square_2_source_node.disconnect();
            }
            catch (err) {}
            console.log("SqWv2 Audio Setup, frequency: "+square_2.frequency+", duty: "+square_2.duty);
            square_2_source_node = audio_ctx.createBufferSource();
            square_2_source_node.buffer = square_2_buffer;
            square_2_source_node.connect(audio_merger);
            square_2_source_node.start();
            square_2.started = true;
            break;
        case wave_table.id:
            try {
                wave_table_source_node.disconnect();
            }
            catch (err) {}
            console.log("WvTbl Audio Setup, frequency: "+wave_table.frequency+", duty: "+wave_table.duty);
            wave_table_source_node = audio_ctx.createBufferSource();
            wave_table_source_node.buffer = wave_table_buffer;
            wave_table_source_node.connect(audio_merger);
            wave_table_source_node.start();
            wave_table.started = true;
            break;
    }
};

function load_xff(XFF) {
    if (XFF[0x10] !== old_xff[0x10]) {
        square_1.sweep_period = (XFF[0x10] & 0b0111_0000) >> 4;
        square_1.negate_shift = (XFF[0x10] & 0b0000_1000) >> 3;
        square_1.shift = (XFF[0x10] & 0b0000_0111);
    }
    if (XFF[0x11] !== old_xff[0x11]) {
        square_1.duty = (XFF[0x11] & 0b1100_0000) >> 6;
        square_1.length_load = (XFF[0x11] & 0b0011_1111);
    }
    if (XFF[0x12] !== old_xff[0x12]) {
        square_1.starting_volume = (XFF[0x12] & 0b1111_0000) >> 4;
        square_1.envelope_mode = (XFF[0x12] & 0b0000_1000) >> 3;
        square_1.envelope_period = (XFF[0x12] & 0b0000_0111);
        if (square_1.volume === 0) {
            // try {
            //     square_1_source_node.disconnect();
            // }
            // catch (err) {}
        }
    }
    if (XFF[0x13] !== old_xff[0x13]) {
        let old_freq = square_1.frequency;
        square_1.frequency = XFF[0x13] + ((XFF[0x14] & 0b0000_0111) << 8);
        if (square_1.frequency !== old_freq) {
            square_1.freq_change = true;
            TriggerBufferReset(square_1.id, XFF);
            square_1.volume = square_1.starting_volume;
        }
    }
    if (XFF[0x14] !== old_xff[0x14]) {
        let old_freq = square_1.frequency;
        square_1.frequency = XFF[0x13] + ((XFF[0x14] & 0b0000_0111) << 8);
        square_1.enable = (XFF[0x14] & 0b1000_0000) >> 7;
        square_1.length_enable = (XFF[0x14] & 0b0100_0000) >> 6;
        if (square_1.frequency !== old_freq) {
            square_1.freq_change = true;
            TriggerBufferReset(square_1.id, XFF);
            square_1.volume = square_1.starting_volume;
        }
        if (square_1.enable) {
            TriggerBufferReset(square_1.id, XFF);
            square_1.volume = square_1.starting_volume;
        }else {
            // try {
            //     square_1_source_node.disconnect();
            // }
            // catch (err) {}
        }
    }
    if (XFF[0x16] !== old_xff[0x16]) {
        square_2.duty = (XFF[0x16] & 0b1100_0000) >> 6;
        square_2.length_load = (XFF[0x16] & 0b0011_1111);
    }
    if (XFF[0x17] !== old_xff[0x17]) {
        square_2.starting_volume = (XFF[0x17] & 0b1111_0000) >> 4;
        square_2.envelope_mode = (XFF[0x17] & 0b0000_1000) >> 3;
        square_2.envelope_period = (XFF[0x17] & 0b0000_0111);
        if (square_2.volume === 0) {
            // try {
            //     square_2_source_node.disconnect();
            // }
            // catch (err) {}
        }
    }
    if (XFF[0x18] !== old_xff[0x18]) {
        let old_freq = square_2.frequency;
        square_2.frequency = XFF[0x18] + ((XFF[0x19] & 0b0000_0111) << 8);
        if (square_2.frequency !== old_freq) {
            square_2.freq_change = true;
            TriggerBufferReset(square_2.id, XFF);
            square_2.volume = square_2.starting_volume;
        }
    }
    if (XFF[0x19] !== old_xff[0x19]) {
        let old_freq = square_2.frequency;
        square_2.frequency = XFF[0x18] + ((XFF[0x19] & 0b0000_0111) << 8);
        square_2.enable = (XFF[0x19] & 0b1000_0000) >> 7;
        square_2.length_enable = (XFF[0x19] & 0b0100_0000) >> 6;
        if (square_2.frequency !== old_freq) {
            square_2.freq_change = true;
            TriggerBufferReset(square_2.id, XFF);
            square_2.volume = square_2.starting_volume;
        }
        if (square_2.enable) {
            TriggerBufferReset(square_2.id, XFF);
            square_2.volume = square_2.starting_volume;
        }else {
            // try {
            //     square_2_source_node.disconnect();
            // }
            // catch (err) {}
        }
    }
    if (XFF[0x1A] !== old_xff[0x1A]) {
        wave_table.dac_power = (XFF[0x1A] & 0b1000_0000) >> 7;
    }
    if (XFF[0x1B] !== old_xff[0x1B]) {
        wave_table.length_load = XFF[0x1B];
    }
    if (XFF[0x1B] !== old_xff[0x1B]) {
        wave_table.volume = (XFF[0x1B] & 0b0110_0000) >> 5;
        if (wave_table.volume === 0) {
            // try {
            //     wave_table_source_node.disconnect();
            // }
            // catch (err) {}
        }
    }
    if (XFF[0x1D] !== old_xff[0x1D]) {
        let old_freq = wave_table.frequency;
        wave_table.frequency = XFF[0x1D] + ((XFF[0x1E] & 0b0000_0111) << 8);
        if (wave_table.frequency !== old_freq) {
            wave_table.freq_change = true;
            TriggerBufferReset(wave_table.id, XFF);
        }
    }
    if (XFF[0x1E] !== old_xff[0x1E]) {
        let old_freq = wave_table.frequency;
        wave_table.frequency = XFF[0x1D] + ((XFF[0x1E] & 0b0000_0111) << 8);
        wave_table.enable = (XFF[0x1E] & 0b1000_0000) >> 7;
        wave_table.length_enable = (XFF[0x1E] & 0b0100_0000) >> 6;
        if (wave_table.frequency !== old_freq) {
            wave_table.freq_change = true;
            TriggerBufferReset(wave_table.id, XFF);
        }
        if (wave_table.enable) {
            TriggerBufferReset(wave_table.id, XFF);
        }else {
            // try {
            //     wave_table_source_node.disconnect();
            // }
            // catch (err) {}
        }
    }
    if (XFF[0x24] !== old_xff[0x24]) {
        control.left_vol = (XFF[0x24] & 0b0111_0000) >> 4;
        control.right_vol = (XFF[0x24] & 0b0000_0111);
    }
    if (XFF[0x25] !== old_xff[0x25]) {
        control.noi_left = (XFF[0x25] & 0b1000_0000) >> 7;
        control.wav_left = (XFF[0x25] & 0b0100_0000) >> 6;
        control.sq1_left = (XFF[0x25] & 0b0010_0000) >> 5;
        control.sq2_left = (XFF[0x25] & 0b0001_0000) >> 4;
        control.noi_right = (XFF[0x25] & 0b0000_1000) >> 3;
        control.wav_right = (XFF[0x25] & 0b0000_0100) >> 2;
        control.sq1_right = (XFF[0x25] & 0b0000_0010) >> 1;
        control.sq2_right = (XFF[0x25] & 0b0000_0001);
        console.log(XFF[0x25].toString(2).padStart(8, "0"));
    }
    if (XFF[0x26] !== old_xff[0x26]) {
        control.enable = (XFF[0x26] & 0b1000_0000) >> 7;
        control.noi_length_status = (XFF[0x26] & 0b0000_1000) >> 3;
        control.wav_length_status = (XFF[0x26] & 0b0000_0100) >> 2;
        control.sq1_length_status = (XFF[0x26] & 0b0000_0010) >> 1;
        control.sq2_length_status = (XFF[0x26] & 0b0000_0001);
    }
    old_xff = Array.from(XFF);
};


let store_cycles = 0;
let cycle_cuttoff = 7000000; // just under 100 frames
let watchdog_cuttoff = 1000000; // just under 100 frames

let initial_buffer = 300;

function channel_clocker(cycles, XFF) {
    if (sound_enabled) {
        if (XFF !== old_xff) {
            load_xff(XFF);
        }

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

        // Generate sound faster when running slow so that frequencies
        // do not change.
        cycles *= (ms_per_cycle/full_speed)*1.05;

        // Square Wave 1
        square_1.cycles += cycles;
        if (square_1.cycles > (2048-square_1.frequency)*4) {
            square_1.cycles -= (2048-square_1.frequency)*4;
            square_1.clock_tick += 1;
            square_1.clock_tick &= 0b111;

            // Remap to -1, 1
            if (control.enable === 1 && square_1.enable === 1) {
                let blip = getSquareWave(square_1.clock_tick, square_1.duty);
                let left_blip = blip*(square_1.volume/15)*((control.left_vol+1)/8)*control.sq1_left;
                let right_blip = blip*(square_1.volume/15)*((control.right_vol+1)/8)*control.sq1_right;
                AddAudioBlip(square_1.id, (left_blip*2)-1, (right_blip*2)-1);
            }else {
                // console.log("SqWv1 Disabled");
                AddAudioBlip(square_1.id, 0, 0);
            }
            if (square_1_buffer_pos >= initial_buffer && !square_1.started) {
                TriggerAudioChannel(square_1.id);
            }
        }

        // Square Wave 2
        square_2.cycles += cycles;
        if (square_2.cycles > (2048-square_2.frequency)*4) {
            square_2.cycles -= (2048-square_2.frequency)*4;
            square_2.clock_tick += 1;
            square_2.clock_tick &= 0b111;

            // Remap to -1, 1
            if (control.enable === 1 && square_2.enable === 1) {
                let blip = getSquareWave(square_2.clock_tick, square_2.duty);
                let left_blip = blip*(square_2.volume/15)*((control.left_vol+1)/8)*control.sq2_left;
                let right_blip = blip*(square_2.volume/15)*((control.right_vol+1)/8)*control.sq2_right;
                AddAudioBlip(square_2.id, (left_blip*2)-1, (right_blip*2)-1);
            }else {
                // console.log("SqWv2 Disabled");
                AddAudioBlip(square_2.id, 0, 0);
            }
            if (square_2_buffer_pos >= initial_buffer && !square_2.started) {
                TriggerAudioChannel(square_2.id);
            }
        }
        
        wave_table.cycles += cycles;
        if (wave_table.cycles > (2048-wave_table.frequency)*2) {
            wave_table.cycles -= (2048-square_2.frequency)*2;
            wave_table.clock_tick += 1;
            wave_table.clock_tick &= 0b1_1111;

            // Remap to -1, 1
            if (control.enable === 1 && wave_table.enable === 1) {
                let blip = getWaveTableWave(wave_table.clock_tick, XFF);
                let left_blip = blip*((control.left_vol+1)/8)*control.wav_left;
                let right_blip = blip*((control.right_vol+1)/8)*control.wav_right;
                AddAudioBlip(wave_table.id, (left_blip*2)-1, (right_blip*2)-1);
            }else {
                AddAudioBlip(wave_table.id, 0, 0);
            }
            if (wave_table_buffer_pos >= initial_buffer*2 && !wave_table.started) {
                TriggerAudioChannel(wave_table.id);
            }
        }
    }
    return XFF;
};

function length_counter(XFF) {

    // Square Wave 1
    if (square_1.enable === 1 && square_1.length_enable === 1) {
        let length = XFF[0x11] & 0b11_1111;
        length += 1;
        if (length >= 64) {
            XFF[0x14] &= 0b0111_1111;
            // if (dump_instr === 1) {
                console.log("SqWv1 Length counter triggered ------- SHUT OFF");
            // }
            length = 0;
        }
        XFF[0x11] &= 0b1100_0000;
        XFF[0x11] |= length;
        // console.log("SqWv1 Length counter triggered");
    }
    //Square Wave 2
    if (square_2.enable === 1 && square_2.length_enable === 1) {
        let length = XFF[0x16] & 0b11_1111;
        length -= 1;
        /*if (dump_instr === 1) {
            console.log("SqWv2 Length counter triggered: length " + length);
        }*/
        if (length <= 0) {
            XFF[0x19] &= 0b0111_1111;
            // if (dump_instr === 1) {
                console.log("SqWv2 Length counter triggered shut off " + length);
            // }
        }
        XFF[0x16] &= 0b1100_0000;
        XFF[0x16] |= length;
        // console.log("SqWv2 Length counter triggered");
    }
    //Wave Table
    if (wave_table.enable && wave_table.length_enable) {
        let length = XFF[0x1b];
        length -= 1;
        if (length <= 0) {
            XFF[0x1e] &= 0b0111_1111;
            // if (dump_instr === 1) {
                console.log("WvTbl Length counter triggered shut off " + length);
            // }
        }
        XFF[0x1b] = length;
        console.log("WvTbl Length counter triggered: length " + length);
    }

    return XFF;
};

let sw1_sweep = 0;
function sweep(XFF) {
    //Square Wave 1
    let sweep_period = (XFF[0x10] & 0b111_0000) >> 4;
    if ((XFF[0x14] & 0b1000_0000) >> 7 === 1 && sweep_period !== 0) {
        sw1_sweep -= 1;
        if (sw1_sweep <= 0) {
            // if (dump_instr === 1) {
                console.log("Sweep Triggered");
            // }
            sw1_sweep = sweep_period;
            let sweep_shift = XFF[0x10] & 0b111;
            let freq = XFF[0x13] + ((XFF[0x14] & 0b111) << 8);
            if (sweep_period === 0 || sweep_shift === 0) {
                XFF[0x14] &= 0b0111_1111;
                // if (dump_instr === 1) {
                    console.log("SqWv1 Disabled: Sweep");
                // }
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
                // if (dump_instr === 1) {
                    console.log("Shift Successful");
                // }
            }
        }
    }

    return XFF;
}

function volume_envelope(XFF) {

    // Square Wave 1
    if (square_1.enable === 1) {
        square_1.env_tick += 1;
        if (square_1.env_tick > square_1.envelope_period && square_1.envelope_period !== 0) {
            square_1.env_tick = 0;
            if (square_1.envelope_mode === 0) {
                square_1.volume -= 1;
                if (square_1.volume < 0) {
                    square_1.volume = 0;
                    square_1.enable = 0;
                }
            }else {
                square_1.volume += 1;
                square_1.volume &= 0b1111;
            }
        }
    }

    // Square Wave 2
    if (square_2.enable === 1) {
        square_2.env_tick += 1;
        if (square_2.env_tick > square_2.envelope_period && square_2.envelope_period !== 0) {
            square_2.env_tick = 0;
            if (square_2.envelope_mode === 0) {
                square_2.volume -= 1;
                if (square_2.volume < 0) {
                    square_2.volume = 0;
                    square_2.enable = 0;
                }
            }else {
                square_2.volume += 1;
                square_2.volume &= 0b1111;
            }
        }
    }

    return XFF;
};

function frame_sequencer(XFF) {
    if (sound_enabled) {
        // console.log(ms_per_cycle);
        if (XFF !== old_xff) {
            load_xff(XFF);
        }
        if (control.enable === 1) {
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
    half_ms = true;
};