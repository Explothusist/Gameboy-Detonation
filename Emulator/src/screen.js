let scale = 4;

const screen_width = 160;
const screen_height = 144;

//document.getElementById is acting oddly, but working
let toggle_bckgnd = document.getElementById("toggle_bckgnd");
let toggle_wnd = document.getElementById("toggle_wnd");
let toggle_spr = document.getElementById("toggle_spr");

let scr_abort = false;
let scr_suspicious = false;

let display_enabled = false;
let window_display = 0x9800;
let background_window_tile = 0x8800;
let background_display = 0x9800;
let sprite_size = 8;
let window_enabled = false;
let sprite_enabled = false;
let background_enabled = false;

let bgpalette = ["#FFFFFF", "#AAAAAA", "#555555", "#000000"];
let palette1 = ["#FFFFFF", "#AAAAAA", "#555555", "#000000"];
let palette2 = ["#FFFFFF", "#AAAAAA", "#555555", "#000000"];
let drawpall = ["", "", "", ""];

let old_lcd = 0b1110_0100;
let old_bgpall = 0b1110_0100;
let old_pall1 = 0b1110_0100;
let old_pall2 = 0b1110_0100;

let scr_d = document.getElementById("display");
let scr_ddraw = scr_d.getContext("2d");

const tiny_screen = new OffscreenCanvas(160, 144);
const ts_ctx = tiny_screen.getContext("2d");

function getScreenContext() {
    scr_d = document.getElementById("display");
    scr_ddraw = scr_d.getContext("2d");
    scr_ddraw.imageSmoothingEnabled = false;
    // scr_ddraw.scale(scale, scale);
};

let toggle_background = true;
let toggle_window = true;
let toggle_sprites = true;

toggle_bckgnd.addEventListener("change", function () {
    toggle_background = toggle_bckgnd.checked;
});
toggle_wnd.addEventListener("change", function () {
    toggle_window = toggle_wnd.checked;
});
toggle_spr.addEventListener("change", function () {
    toggle_sprites = toggle_spr.checked;
});

function load_lcd(lcd) {
    old_lcd = lcd;
    //bit 7: display enable
    if ((lcd & 0b1000_0000) >> 7 === 1) {
        display_enabled = true;
    } else {
        display_enabled = false;
    }
    //bit 6: 'Window Tile Map Display Select'
    if ((lcd & 0b0100_0000) >> 6 === 1) {
        window_display = 0x9c00;
    } else {
        window_display = 0x9800;
    }
    //bit 4: 'BG & Window Tile Data Select'
    if ((lcd & 0b0001_0000) >> 4 === 1) {
        background_window_tile = 0x8000;
    } else {
        background_window_tile = 0x8800;
    }
    //bit 3: 'BG Tile Map Display Select'
    if ((lcd & 0b0000_1000) >> 3 === 1) {
        background_display = 0x9c00;
    } else {
        background_display = 0x9800;
    }
    //bit 2: sprite size
    if ((lcd & 0b0000_0100) >> 2 === 1) {
        sprite_size = 16;
    } else {
        sprite_size = 8;
    }
    //bit 5: window enable
    if ((lcd & 0b0010_0000) >> 5 === 1) {
        window_enabled = true;
    } else {
        window_enabled = false;
    }
    //bit 1: sprite enable
    if ((lcd & 0b0000_0010) >> 1 === 1) {
        sprite_enabled = true;
    } else {
        sprite_enabled = false;
    }
    //bit 0: background enable
    if (lcd & (0b0000_0001 === 1)) {
        background_enabled = true;
    } else {
        background_enabled = false;
    }
}

function load_pall(pall, plsel) {
    let palette = ["", "", "", ""];
    let ncol1 = pall & 0b0000_0011;
    let ncol2 = (pall & 0b0000_1100) >> 2;
    let ncol3 = (pall & 0b0011_0000) >> 4;
    let ncol4 = (pall & 0b1100_0000) >> 6;

    switch (ncol1) {
        case 0:
            palette[0] = "#FFFFFF";
            break;
        case 1:
            palette[0] = "#AAAAAA";
            break;
        case 2:
            palette[0] = "#555555";
            break;
        case 3:
            palette[0] = "#000000";
            break;
        default:
            alert("This is extra-ordinarily bad. Panic.");
    }
    switch (ncol2) {
        case 0:
            palette[1] = "#FFFFFF";
            break;
        case 1:
            palette[1] = "#AAAAAA";
            break;
        case 2:
            palette[1] = "#555555";
            break;
        case 3:
            palette[1] = "#000000";
            break;
        default:
            alert("This is extra-ordinarily bad. Panic.");
    }
    switch (ncol3) {
        case 0:
            palette[2] = "#FFFFFF";
            break;
        case 1:
            palette[2] = "#AAAAAA";
            break;
        case 2:
            palette[2] = "#555555";
            break;
        case 3:
            palette[2] = "#000000";
            break;
        default:
            alert("This is extra-ordinarily bad. Panic.");
    }
    switch (ncol4) {
        case 0:
            palette[3] = "#FFFFFF";
            break;
        case 1:
            palette[3] = "#AAAAAA";
            break;
        case 2:
            palette[3] = "#555555";
            break;
        case 3:
            palette[3] = "#000000";
            break;
        default:
            alert("This is extra-ordinarily bad. Panic.");
    }

    if (plsel === 0) {
        old_bgpall = pall;
        bgpalette = palette;
    }
    if (plsel === 1) {
        old_pall1 = pall;
        palette1 = palette;
    }
    if (plsel === 2) {
        old_pall2 = pall;
        palette2 = palette;
    }
}

// (x, y) -> [y][x]
function load_tile(pos, read, disp_mode, sprite) {
    sprite = sprite || false;
    let tile_data = new Uint8Array(16);
    if (!sprite) {
        /*if (disp_mode === 0x8000) {
            let addr = 0x8000 + pos * 16;
            for (let i = 0; i < 16; i++) {
                tile_data[i] = read(addr + i, 0);
            }
        } else {
            let signed = pos;
            if (signed >= 0b1000_0000) {
                signed = -(~(signed - 1) & 0b1111_1111);
            }
            let addr = 0x8800 + signed * 16;
            for (let i = 0; i < 16; i++) {
                tile_data[i] = read(addr + i, 0);
            }
        }*/
        if (pos < 128) {
            let addr = 0x8000 + pos * 16;
            if (disp_mode === 0x8800) {
                addr += 0x1000;
            }
            for (let i = 0; i < 16; i++) {
                tile_data[i] = read(addr + i, 0);
            }
        } else {
            let addr = 0x8800 + (pos - 128) * 16;
            for (let i = 0; i < 16; i++) {
                tile_data[i] = read(addr + i, 0);
            }
        }
    } else {
        let addr = 0x8000 + pos * 16;
        for (let i = 0; i < 16; i++) {
            tile_data[i] = read(addr + i, 0);
        }
    }

    let colors = [];
    for (let i = 0; i < 8; i++) {
        colors.push([0, 0, 0, 0, 0, 0, 0, 0]);
    }
    for (let i = 0; i < 8; i++) {
        colors[i][0] = ((tile_data[i * 2] & 0b1000_0000) >> 7) + ((tile_data[i * 2 + 1] & 0b1000_0000) >> 7) * 2;
        colors[i][1] = ((tile_data[i * 2] & 0b0100_0000) >> 6) + ((tile_data[i * 2 + 1] & 0b0100_0000) >> 6) * 2;
        colors[i][2] = ((tile_data[i * 2] & 0b0010_0000) >> 5) + ((tile_data[i * 2 + 1] & 0b0010_0000) >> 5) * 2;
        colors[i][3] = ((tile_data[i * 2] & 0b0001_0000) >> 4) + ((tile_data[i * 2 + 1] & 0b0001_0000) >> 4) * 2;
        colors[i][4] = ((tile_data[i * 2] & 0b0000_1000) >> 3) + ((tile_data[i * 2 + 1] & 0b0000_1000) >> 3) * 2;
        colors[i][5] = ((tile_data[i * 2] & 0b0000_0100) >> 2) + ((tile_data[i * 2 + 1] & 0b0000_0100) >> 2) * 2;
        colors[i][6] = ((tile_data[i * 2] & 0b0000_0010) >> 1) + ((tile_data[i * 2 + 1] & 0b0000_0010) >> 1) * 2;
        colors[i][7] = (tile_data[i * 2] & 0b0000_0001) + (tile_data[i * 2 + 1] & 0b0000_0001) * 2;
    }
    return colors;
}

function draw_tile(tile, x, y, sprite, flip) {
    sprite = sprite || false;
    flip = flip || [false, false];
    if (!sprite) {
        for (let i = 0; i < tile.length; i++) {
            for (let j = 0; j < tile[i].length; j++) {
                scr_ddraw.fillStyle = drawpall[tile[i][j]];
                scr_ddraw.fillRect(x + j * scale, y + i * scale, scale, scale);
            }
        }
    } else {
        let modj = 0;// x
        let modi = 0;// y
        for (let i = 0; i < tile.length; i++) { // y
            for (let j = 0; j < tile[i].length; j++) { // x
                if (tile[i][j] !== 0) {
                    if (flip[0]) { // x
                        //alert("HAHa");
                        modj = 7 - j;
                    } else {
                        modj = j;
                    }
                    if (flip[1]) { // y
                        //alert("HAHA");
                        modi = 7 - i;
                    } else {
                        modi = i;
                    }
                    scr_ddraw.fillStyle = drawpall[tile[i][j]];
                    scr_ddraw.fillRect(x + modj * scale, y + modi * scale, scale, scale);
                }
            }
        }
    }
}

function draw(xff, read) {
    // scr_d = document.getElementById("display");
    // scr_ddraw = scr_d.getContext("2d");
    if (xff[0x40] !== old_lcd) {
        load_lcd(xff[0x40]);
    }
    if (xff[0x47] !== old_bgpall) {
        load_pall(xff[0x47], 0);
    }
    if (xff[0x48] !== old_pall1) {
        load_pall(xff[0x48], 1);
    }
    if (xff[0x49] !== old_pall2) {
        load_pall(xff[0x49], 2);
    }
    let tx = 0;
    let ty = 0;
    let tiley = 0;
    let tilex = 0;
    if (display_enabled) {
        if (background_enabled) {
            drawpall = bgpalette;
            tx = xff[0x43];
            ty = xff[0x42];
            tiley = Math.floor(ty * 0.125);
            tilex = Math.floor(tx * 0.125);
            for (let i = tiley; i < tiley + 19; i++) {
                for (let j = tilex; j < tilex + 21; j++) {
                    draw_tile(
                        load_tile(read(background_display + i * 32 + j, 0), read, background_window_tile),
                        (j * 8 - tx) * scale,
                        (i * 8 - ty) * scale
                    );
                }
            }
        } else {
            scr_ddraw.fillStyle = "#FFFFFF";
            scr_ddraw.fillRect(0, 0, screen_width * scale, screen_height * scale);
        }
        if (window_enabled) {
            drawpall = bgpalette;
            tx = xff[0x4b] - 7;
            ty = xff[0x4a];
            tiley = Math.floor(ty * 0.125);
            tilex = Math.floor(tx * 0.125);
            for (let i = 0; i < 19 - tiley; i++) {
                for (let j = 0; j < 21 - tilex; j++) {
                    draw_tile(
                        load_tile(read(window_display + i * 32 + j, 0), read, background_window_tile),
                        (j * 8 + tx) * scale,
                        (i * 8 + ty) * scale
                    );
                }
            }
        }
        if (sprite_enabled) {
            if (sprite_size === 8) {
                let sprites = [];
                for (let i = 0; i < 0x9f; i += 4) {
                    let x = read(0xfe01 + i, 0);
                    let y = read(0xfe00 + i, 0);
                    if (x > 0 && x < 168 && y > 0 && y < 160) {
                        sprites.push([x, y, i]);
                    }
                }
                sprites.sort(function (a, b) {
                    return a[0] - b[0];
                });
                let spry = 0;
                let sprx = 0;
                let sprsrc = 0;
                let sprattr = 0;
                for (let i = sprites.length - 1; i > -1; i--) {
                    spry = sprites[i][1] - 16;
                    sprx = sprites[i][0] - 8;
                    sprsrc = read(0xfe02 + sprites[i][2], 0);
                    sprattr = read(0xfe03 + sprites[i][2], 0);
                    if ((sprattr & 0b1000_0000) >> 7 === 1) {
                        /*alert( "OBJ-to-BG Priority (0=OBJ Above BG, 1=OBJ Behind BG color 1-3) (Used for both BG and Window. BG color 0 is always behind OBJ)" );*/
                    }
                    if ((sprattr & 0b0001_0000) >> 4 === 1) {
                        drawpall = palette2;
                    } else {
                        drawpall = palette1;
                    }
                    let flip = [false, false];
                    if ((sprattr & 0b0100_0000) >> 6 === 1) {
                        flip[1] = true;
                    }
                    if ((sprattr & 0b0010_0000) >> 5 === 1) {
                        flip[0] = true;
                    }
                    /*if (flip[0] || flip[1]) {
                        alert("HAHA");
                    }*/
                    draw_tile(
                        load_tile(sprsrc, read, null, true),
                        sprx * scale,
                        spry * scale,
                        true,
                        flip
                    );
                    sprites.push({ y: spry, x: sprx });
                }
            } else if (sprite_size === 16) {
                let sprites = [];
                for (let i = 0; i < 0x9f; i += 4) {
                    let x = read(0xfe01 + i, 0);
                    let y = read(0xfe00 + i, 0);
                    if (x > 0 && x < 168 && y > 0 && y < 160) {
                        sprites.push([x, y, i]);
                    }
                }
                sprites.sort(function (a, b) {
                    return a[0] - b[0];
                });
                let spry = 0;
                let sprx = 0;
                let sprsrc = 0;
                let sprsrc1 = 0;
                let sprsrc2 = 0;
                let sprattr = 0;
                for (let i = sprites.length - 1; i > -1; i--) {
                    spry = sprites[i][1] - 16;
                    sprx = sprites[i][0] - 8;
                    sprsrc = read(0xfe02 + sprites[i][2], 0);
                    sprsrc1 = sprsrc & 0xfe;
                    sprsrc2 = sprsrc | 0x01;
                    sprattr = read(0xfe03 + sprites[i][2], 0);
                    if ((sprattr & 0b1000_0000) >> 7 === 1) {
                        alert( "OBJ-to-BG Priority (0=OBJ Above BG, 1=OBJ Behind BG color 1-3) (Used for both BG and Window. BG color 0 is always behind OBJ)" );
                    }
                    if ((sprattr & 0b1_0000) >> 4 === 1) {
                        drawpall = palette2;
                    } else {
                        drawpall = palette1;
                    }
                    let flip = [false, false];
                    if ((sprattr & 0b0100_0000) >> 6 === 1) {
                        flip[1] = true;
                    }
                    if ((sprattr & 0b0010_0000) >> 5 === 1) {
                        flip[0] = true;
                    }
                    /*if (flip[0] || flip[1]) {
                        alert("HAHA");
                    }*/
                    if (!flip[0]) {
                        draw_tile( load_tile(sprsrc1, read, null, true), sprx * scale, spry * scale, true, flip);
                        draw_tile( load_tile(sprsrc2, read, null, true), sprx * scale, (spry + 8) * scale, true, flip);
                    } else {
                        draw_tile( load_tile(sprsrc1, read, null, true), sprx * scale, spry * scale, true, flip);
                        draw_tile( load_tile(sprsrc2, read, null, true), sprx * scale, (spry + 8) * scale, true, flip);
                    }
                    sprites.push({ y: spry, x: sprx });
                }
            }
        }
    } else {
        scr_ddraw.fillStyle = "#DDDDDD";
        scr_ddraw.fillRect(0, 0, screen_width * scale, screen_height * scale);
    }
}

let scanline = 0;
let dot_on_line = 0;

let background_tile_line = [];
let background_line_y = -8;
let window_tile_line = [];
let window_internal_line_counter = 0;
let window_line_y = -8;
let sprite_tile_line = [];
let sprite_line_y = -8;

function load_new_window_tile_line(pixel_y, xff, read) {
    let window_pixel_x = xff[0x4b] - 7;
    let window_pixel_y = xff[0x4a];
    // Because of hardware quirks, the window is less intelligent than this
    let real_window_tile_y = Math.floor((pixel_y-window_pixel_y) / 8);
    // If the window is half-drawn, then moved, it still picks up where it left off
    let window_tile_y = window_internal_line_counter;

    // Reset 
    window_tile_line = []; // (x, mody) -> [mody][x]
    for (let i = 0; i < 8; i++) {
        window_tile_line.push([]);
        for (let j = 0; j < screen_width; j++) {
            window_tile_line[i].push("#000000");
        }
    }

    // Unlike load_new_background_tile_line, i only iterates over screen after start of window
    for (let i = 0; window_pixel_x+(i*8) < screen_width; i++) {
        let window_tile_x = i;
        let current_tile = load_tile(read(window_display + (window_tile_y*32) + window_tile_x, 0), read, background_window_tile, false);

        for (let j = 0; j < 8; j++) {// y within current_tile
            for (let k = 0; k < 8; k++) { // x within current_tile
                // Test for overflow offscreen
                if (window_pixel_x+(window_tile_x*8)+k < screen_width) {
                    window_tile_line[j][window_pixel_x+(window_tile_x*8)+k] = current_tile[j][k];
                }
            }
        }
    }

    window_internal_line_counter += 1;
    window_line_y = window_pixel_y + (real_window_tile_y*8);
};

function load_new_background_tile_line(pixel_y, xff, read) {
    let background_pixel_x = xff[0x43];
    let background_pixel_y = xff[0x42];
    // This is the what is cut off by rounding in background_tile_x
    // Applied to current_tile_x later so we don't have to keep track of pixel_x with background_pixel_x
    let background_pixel_xshift = ((background_pixel_x + 256) % 8);
    let background_pixel_yshift = ((background_pixel_y + 256) % 8);
    // This can give a negative value
    let background_tile_x = Math.floor((-background_pixel_x) / 8);
    let background_tile_y = Math.floor((pixel_y+background_pixel_y) / 8);
    // Use mod to implement the wrap around
    background_tile_x = (background_tile_x + 32) % 32;
    background_tile_y = (background_tile_y + 32) % 32;

    // Reset 
    background_tile_line = []; // (x, mody) -> [mody][x]
    for (let i = 0; i < 8; i++) {
        background_tile_line.push([]);
        for (let j = 0; j < screen_width; j++) {
            background_tile_line[i].push("#000000");
        }
    }

    for (let i = 0; i < 32; i++) {
        let current_tile_x = i;
        let curr_pixel_x = (current_tile_x*8)-background_pixel_x;
        curr_pixel_x = (curr_pixel_x+256) % 256;
        
        let current_tile = load_tile(read(background_display + (background_tile_y*32) + current_tile_x, 0), read, background_window_tile, false);
        
        for (let j = 0; j < 8; j++) {// y within current_tile
            for (let k = 0; k < 8; k++) { // x within current_tile
                let pixel_x = curr_pixel_x+k;
                pixel_x = (pixel_x + 256) % 256;
                // Test for overflow offscreen
                if (pixel_x >= 0 && pixel_x < screen_width) {
                    background_tile_line[j][pixel_x] = current_tile[j][k];
                }
            }
        }
    }

    let line = -background_pixel_yshift;
    while (line <= pixel_y) {
        line += 8;
    }
    background_line_y = line-8;
};

function load_new_sprite_tile_line(pixel_y, xff, read) {
    let sprites = [];
    // Retreive first 10 sprites which overlap this scanline
    for (let i = 0; i < 0x9f && sprites.length <= 9; i += 4) {
        let y = read(0xfe00 + i, 0);
        // (y-16) because of gameboy hardware setup for offscreen upward
        if (pixel_y >= (y-16) && pixel_y < (y-16)+sprite_size) {
            let x = read(0xfe01 + i, 0);
            if (x > 0 && x < 168 && y > 0 && y < 160) {
                sprites.push([x, y, i]);
            }
        }
    }
    sprites.sort(function (a, b) {
        return a[0] - b[0];
    });

    sprite_tile_line = [];
    for (let i = 0; i < screen_width; i++) {
        sprite_tile_line.push({pixel: "#000000", sprite: false, over: true});
    }

    for (let i = 0; i < sprites.length; i++) {
        let sprite_y = sprites[i][1] - 16;
        let sprite_x = sprites[i][0] - 8;
        let sprite_source = read(0xfe02 + sprites[i][2], 0);
        let sprite_attribute = read(0xfe03 + sprites[i][2], 0);
        let over = true;
        let palette = palette1;
        if (((sprite_attribute & 0b1000_0000) >> 7) === 1) {
            over = false;
        }
        if (((sprite_attribute & 0b0001_0000) >> 4) === 1) {
            palette = palette2;
        }
        let flip = [false, false]; // [x, y]
        if (((sprite_attribute & 0b0100_0000) >> 6) === 1) {
            flip[1] = true; // y-flip
        }
        if (((sprite_attribute & 0b0010_0000) >> 5) === 1) {
            flip[0] = true; // x-flip
        }
        
        if (sprite_size === 8) {
            // 8x8
            let current_sprite = load_tile(sprite_source, read, null, true);
            if (flip[0]) { // x-flip
                for (let j = 0; j < current_sprite.length; j++) {
                    current_sprite[j].reverse();
                }
            }
            if (flip[1]) { // y-flip
                current_sprite.reverse();
            }
            for (let j = 0; j < 8; j++) { // looping through x in current_sprite
                if (sprite_x+j >= 0 && sprite_x+j < screen_width) {
                    // Making sure another sprite was not already drawn there and that this one isn't transparent
                    if (!sprite_tile_line[sprite_x+j].sprite && current_sprite[pixel_y-sprite_y][j] !== 0) {
                        sprite_tile_line[sprite_x+j] = {pixel: current_sprite[pixel_y-sprite_y][j], palette: palette, sprite: true, over: over};
                    }
                }
            }
        }else {
            // 8x16
            let current_sprite1 = load_tile((sprite_source & 0xfe), read, null, true);
            let current_sprite2 = load_tile((sprite_source | 0x01), read, null, true);
            if (flip[0]) { // x-flip
                for (let j = 0; j < current_sprite1.length; j++) {
                    current_sprite1[j].reverse();
                }
                for (let j = 0; j < current_sprite2.length; j++) {
                    current_sprite2[j].reverse();
                }
            }
            if (flip[1]) { // y-flip
                let store_sprite = current_sprite1.reverse();
                current_sprite1 = current_sprite2.reverse();
                current_sprite2 = store_sprite;
            }
            let y_pos_in_sprite = pixel_y-sprite_y;
            let current_sprite = current_sprite1;
            if (y_pos_in_sprite >= 8) {
                current_sprite = current_sprite2;
                y_pos_in_sprite -= 8;
            }
            for (let j = 0; j < 8; j++) { // looping through x in current_sprite
                if (sprite_x+j >= 0 && sprite_x+j < screen_width) {
                    // Making sure another sprite was not already drawn there and that this one isn't transparent
                    if (!sprite_tile_line[sprite_x+j].sprite && current_sprite[y_pos_in_sprite][j] !== 0) {
                        sprite_tile_line[sprite_x+j] = {pixel: current_sprite[y_pos_in_sprite][j], palette: palette, sprite: true, over: over};
                    }
                }
            }
        }
    }

    sprite_line_y = pixel_y;
};

let scanline_image_data = scr_ddraw.createImageData(160, 1);
function hex_to_greyscale(hex) {
    switch (hex) {
        case "#FFFFFF":
            return 0xff;
        case "#AAAAAA":
            return 0xaa;
        case "#555555":
            return 0x55;
        case "#000000":
            return 0;
    }
};

function draw_dots(dots, xff, read) {
    // scr_d = document.getElementById("display");
    // scr_ddraw = scr_d.getContext("2d");
    if (xff[0x40] !== old_lcd) {
        load_lcd(xff[0x40]);
    }
    if (xff[0x47] !== old_bgpall) {
        load_pall(xff[0x47], 0);
    }
    if (xff[0x48] !== old_pall1) {
        load_pall(xff[0x48], 1);
    }
    if (xff[0x49] !== old_pall2) {
        load_pall(xff[0x49], 2);
    }

    for (let i = 0; i < dots; i++) {
        // Test to see if screen is even enabled
        if (display_enabled) {
            // Test to see if current scanline is on screen
            // If not: V-Blank
            if (scanline < screen_height) {
                // Test to see if current dot is on screen
                // If low: OAM Scan, If high: H-Blank
                if (dot_on_line >= 80 && dot_on_line < 80+screen_width) {
                    let pixel_x = dot_on_line-80;
                    let pixel_y = scanline;

                    // First determine pixel of background or window
                    let is_background_pixel = false;
                    let background_pixel = 0;
                    // If window is enabled and on screen, it takes precedence over background
                    if (window_enabled && toggle_window) {
                        let window_pixel_x = xff[0x4b] - 7;
                        let window_pixel_y = xff[0x4a];
                        
                        // Test if current pixel is inside window
                        if (window_pixel_x <= pixel_x && window_pixel_y <= pixel_y) {
                            // Test if we have left the preloaded window tiles
                            if (pixel_y >= window_line_y+8) {
                                load_new_window_tile_line(pixel_y, xff, read);
                            }

                            is_background_pixel = true;
                            // Pre-loaded array has not yet passed through palette
                            background_pixel = window_tile_line[pixel_y-window_line_y][pixel_x];
                        }
                    }
                    // Use background if it is enabled and window is not already setting
                    if (background_enabled && !is_background_pixel && toggle_background) {
                        // Test if we have left the preloaded window tiles
                        if (pixel_y >= background_line_y+8) {
                            load_new_background_tile_line(pixel_y, xff, read);
                        }

                        is_background_pixel = true;
                        // Pre-loaded array has not yet passed through palette
                        if (pixel_y-background_line_y >= 8 || pixel_y-background_line_y < 0) {
                            alert(pixel_y+", "+background_line_y);
                        }
                        background_pixel = background_tile_line[pixel_y-background_line_y][pixel_x];
                    }

                    // Second, determine pixel of sprite, if there is one
                    let is_sprite_pixel = false;
                    let sprite_pixel = 0;
                    let sprite_pixel_over = true;
                    let sprite_palette = [];
                    if (sprite_enabled && toggle_sprites) {
                        //Test if we have loaded this line's sprites
                        if (pixel_y !== sprite_line_y) {
                            load_new_sprite_tile_line(pixel_y, xff, read);
                        }

                        if (sprite_tile_line[pixel_x].sprite) {
                            sprite_pixel = sprite_tile_line[pixel_x].pixel;
                            is_sprite_pixel = true;
                            sprite_pixel_over = sprite_tile_line[pixel_x].over;
                            sprite_palette = sprite_tile_line[pixel_x].palette;
                        }
                    }

                    // Compare pixels and test which to draw
                    let pixel = "#000000";
                    if (sprite_pixel_over) {
                        if (is_sprite_pixel && sprite_pixel !== 0) {
                            pixel = sprite_palette[sprite_pixel];
                        }else {
                            pixel = bgpalette[background_pixel];
                        }
                    }else {
                        if (background_pixel !== 0) {
                            pixel = bgpalette[background_pixel];
                        }else {
                            if (is_sprite_pixel && sprite_pixel !== 0) {
                                pixel = sprite_palette[sprite_pixel];
                            }else {
                                pixel = bgpalette[background_pixel];
                            }
                        }
                    }

                    // scr_ddraw.fillStyle = pixel;
                    // scr_ddraw.fillRect(pixel_x * scale, pixel_y * scale, scale, scale);

                    // Create our own image to improve performance
                    // Adds this pixel to the ImageData element which wil be drawn at
                    // the end of the scanline
                    let greyscale_value = hex_to_greyscale(pixel);
                    // console.log(pixel, greyscale_value);
                    scanline_image_data.data[(pixel_x*4)] = greyscale_value;
                    scanline_image_data.data[(pixel_x*4)+1] = greyscale_value;
                    scanline_image_data.data[(pixel_x*4)+2] = greyscale_value;
                    scanline_image_data.data[(pixel_x*4)+3] = 0xff;
                }
            }
        }

        dot_on_line += 1;
        if (dot_on_line >= 456) {
            dot_on_line = 0;

            // End of scanline has been reached; draw the ImageData
            // from the line. No need to clear because it will be 
            // overridden
            ts_ctx.putImageData(scanline_image_data, 0, scanline/**scale*/);

            scanline += 1;
            if (scanline >= 154) {
                scanline = 0;
                // Hack to prevent overflow drawing of next frame
                // I am not sure of the relevance of the above comment
                break;
            }
        }
    }
};

function transfer_frame() {
    scr_ddraw.drawImage(tiny_screen, 0, 0, 160, 144, 0, 0, 160*scale, 144*scale);
};

function reset_screen_drawing() {
    scanline = 0;
    dot_on_line = 0;
    background_tile_line = [];
    background_line_y = -8;
    window_tile_line = [];
    window_line_y = -8;
    window_internal_line_counter = 0;
    sprite_tile_line = [];
    sprite_line_y = -8;
};
