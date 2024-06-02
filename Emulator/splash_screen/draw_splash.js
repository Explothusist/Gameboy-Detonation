
let red_and_bomb = new Image();
red_and_bomb.src = "splash_screen/red_and_bomb.png";
let gameboy_transparent = new Image();
gameboy_transparent.src = "splash_screen/gameboy_transparent.png";
let bomb_tile = new Image();
bomb_tile.onload = function() {
    display_splash_screen();
};
bomb_tile.src = "splash_screen/bomb_tile.png";

let splash_canv = document.getElementById("display");
splash_canv.outerHTML = "<canvas width='" + (160 * scale).toString() + "' height='" + (144 * scale).toString() + "' id='display'></canvas>";
splash_canv = document.getElementById("display");
let splash_draw = splash_canv.getContext("2d");
splash_draw.imageSmoothingEnabled = false;
splash_draw.fillStyle = "#FF0000";
splash_draw.fillRect(0, 0, 160 * scale, 144 * scale);

display_splash_screen = function() {
    for (let i = 0; i < 160*scale; i += 16*scale) {
        for (let j = 0; j < 144*scale; j += 16*scale) {
            splash_draw.drawImage(bomb_tile, 0, 0, 16, 16, i, j, 16*scale, 16*scale);
        }
    }
    splash_draw.drawImage(gameboy_transparent, 0, 0, 160, 144, 0, 0, 160*scale, 144*scale);
};