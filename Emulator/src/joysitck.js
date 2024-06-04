
let gamepads = [];
let old_gamepad_states = [];

function gamepadHandler(event, connected) {
  const new_gamepad = event.gamepad;
  // Note:
  // gamepad === navigator.getGamepads()[gamepad.index]

  if (connected) {
    gamepads.push(new_gamepad);
    old_gamepad_states.push([]);
    for (let i in new_gamepad.buttons) {
        old_gamepad_states.at(-1).push(false);
    }
  } else {
    for (let i in gamepads) {
        let gamepad = gamepads[i];
        if (gamepad.index === new_gamepad.index) {
            gamepads.splice(i, 1);
        }
    }
  }
}

window.addEventListener(
  "gamepadconnected",
  (e) => {
    gamepadHandler(e, true);
  },
  false,
);
window.addEventListener(
  "gamepaddisconnected",
  (e) => {
    gamepadHandler(e, false);
  },
  false,
);


let gamepad_loop;

function gamepad_listen() {

};
function get_gamepad_events() {
    let events = [];
    for (let i in gamepads) {
        let gamepad = gamepads[i];
        for (let j in gamepad.buttons) {
            if (gamepad.buttons[j].pressed !== old_gamepad_states[i][j]) {
                old_gamepad_states[i][j] = gamepad.buttons[j].pressed;
                events.push({gamepad: i, button: j, new_state: gamepad.buttons[j].pressed});
            }
        }
    }
    return events;
};

function begin_gamepad_listening() {
    gamepad_loop = setInterval(gamepad_listen, 10);
};
function end_gamepad_listening() {
    clearInterval(gamepad_loop);
};