let scale = 4;

const screen_width = 160;
const screen_height = 144;

//document.getElementById is acting oddly, but working

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
    scr_d = document.getElementById("display");
    scr_ddraw = scr_d.getContext("2d");
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
let window_line_y = -8;
let loaded_sprites = [];

function load_new_window_tile_line(pixel_y) {
    let window_pixel_x = xff[0x4b] - 7;
    let window_pixel_y = xff[0x4a];
    let window_tile_y = Math.floor((pixel_y-window_pixel_y) / 8);

    window_tile_line = []; // (x, mody) -> [mody][x]
    for (let i = 0; i < 8; i++) {
        window_tile_line.push([]);
        for (let j = 0; j < screen_width; j++) {
            window_tile_line[i].push("#000000");
        }
    }

    for (let i = 0; window_pixel_x+(i*8) < screen_width; i++) {
        let window_tile_x = i;
        let current_tile = load_tile(read(background_display + (window_tile_y*32) + window_tile_x, 0), read, background_window_tile, false);

        for (let j = 0; j < 8; j++) {// y within current_tile
            for (let k = 0; k < 8; k++) { // x within current_tile
                // Test for overflow offscreen
                if (window_pixel_x+(window_tile_x*8)+k < screen_width) {
                    window_tile_line[j][window_pixel_x+(window_tile_x*8)+k] = bgpalette[current_tile[j][k]];
                }
            }
        }
    }

    window_line_y = window_pixel_y + (window_tile_y*8);
};

function draw_dots(dots, xff, read) {
    scr_d = document.getElementById("display");
    scr_ddraw = scr_d.getContext("2d");
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
                    let background_pixel = "#000000";
                    // If window is enabled and on screen, it takes precedence over background
                    if (window_enabled) {
                        let window_pixel_x = xff[0x4b] - 7;
                        let window_pixel_y = xff[0x4a];
                        
                        // Test if current pixel is inside window
                        if (window_pixel_x <= pixel_x && window_pixel_y <= pixel_y) {
                            is_background_pixel = true;

                            // Test if we have left the preloaded window tiles
                            if (pixel_y >= window_line_y+8) {
                                load_new_window_tile_line(pixel_y);
                            }
                        }
                    }
                }
            }
        }

        dot_on_line += 1;
        if (dot_on_line >= 456) {
            dot_on_line = 0;
            scanline += 1;
            if (scanline >= 154) {
                scanline = 0;
                // Hack to prevent overflow drawing of next frame
                break;
            }
        }
    }
};
