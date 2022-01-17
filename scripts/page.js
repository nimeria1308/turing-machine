var machine = null;
var animation = null;
var halted = false;
var preview = null;

function set_contents(element, contents) {
    while (element.lastElementChild) {
        element.removeChild(element.lastElementChild);
    }
    element.appendChild(contents);
}

function show_error_dialog(error) {
    const modal_element = document.getElementById("modal_error");
    const modal = new bootstrap.Modal(modal_element);
    const modal_message = document.getElementById("modal_error_message");
    modal_message.innerText = error;
    console.log(error);
    modal.show();
}

var filename = "turing_machine.json";

function file_changed(file) {
    const f = file.files[0];
    if (f) {
        const source = document.getElementById("machine_source");
        if (confirm("Are you sure you want to replace the loaded machine?")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                filename = f.name;

                stop_machine();

                try {
                    // parse JSON
                    const config = JSON.parse(event.target.result);

                    if (!("start" in config)) {
                        throw `"start" key missing in '${f.name}'`;
                    }
                    const start = document.getElementById("machine_start");
                    start.value = config.start;

                    // optional
                    const halt = document.getElementById("machine_halt");
                    halt.value = ("halt" in config) ? config.halt : "";

                    if (!("empty_symbol" in config)) {
                        throw `"empty_symbol" key missing in '${f.name}'`;
                    }
                    const empty_symbol = document.getElementById("machine_empty_symbol");
                    empty_symbol.value = config.empty_symbol;

                    // optional
                    const tape = document.getElementById("machine_tape");
                    tape.value = ("tape" in config) ? config.tape : "";

                    if (!("rules" in config)) {
                        throw `"rules" key missing in '${f.name}'`;
                    }
                    const rules = document.getElementById("machine_rules");
                    rules.value = config.rules.join("\n");

                    // update preview
                    schedule_preview();
                } catch (e) {
                    show_error_dialog(e);
                }
            };
            reader.readAsText(f);
        }
    }
}

function config_from_inputs() {
    const config = {};

    const rules_input = document.getElementById("machine_rules");
    config.rules = [];
    for (let rule of rules_input.value.split("\n")) {
        if (rule != "") {
            config.rules.push(rule.split(","));
        }
    }

    const start_input = document.getElementById("machine_start");
    config.start = start_input.value;

    const empty_symbol_input = document.getElementById("machine_empty_symbol");
    config.empty_symbol = empty_symbol_input.value;

    // optional
    const halt_input = document.getElementById("machine_halt");
    if (halt_input.value) {
        config.halt = halt_input.value;
    }

    const tape_input = document.getElementById("machine_tape");
    if (tape_input.value) {
        config.tape = tape_input.value.split(",");
    }

    return config;
}

function save_machine() {
    try {
        const config = config_from_inputs();

        filename = prompt("Enter filename for turing machine", filename);

        if (filename != null) {
            if (!filename.endsWith(".json")) {
                filename = filename + ".json";
            }

            // Generate JSON
            const text = JSON.stringify(config, null, 4);

            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            saveAs(blob, filename);
        }
    } catch (e) {
        show_error_dialog(e);
    }
}

function stop_machine() {
    if (animation != null) {
        clearInterval(animation);
        animation = null;
    }
}

function render_machine(on_render = null) {
    const machine_div = document.getElementById("machine");
    const tape_div = document.getElementById("tape");
    const operation_div = document.getElementById("operation");
    const rules_div = document.getElementById("rules");

    machine.renderGraph()
        .then((graph) => {
            set_contents(machine_div, graph);
            set_contents(tape_div, machine.renderTape());
            set_contents(operation_div, machine.render_operation());
            set_contents(rules_div, machine.render_rules());

            if (on_render != null) {
                on_render();
            }

        })
        .catch(error => {
            console.error(error);
        });
}

function run_machine() {
    stop_machine();
    halted = false;

    animation = setInterval(function() {
        render_machine(function() {
            if (!machine.advance()) {
                stop_machine();
                halted = true;
                update_inspection_buttons();
            }
        });
    }, 100);
}

function schedule_preview() {
    stop_machine();
    machine = null;

    // disable "inspection tab", until passes verification
    const inspect_tab = document.getElementById("inspect-tab");
    inspect_tab.classList.add("disabled");

    if (preview != null) {
        clearTimeout(preview);
        preview = null;
    }

    preview = setTimeout(() => {
        const machine_div = document.getElementById("machine_preview");
        const machine_status_div = document.getElementById("machine_preview_status");

        try {
            const config = config_from_inputs();
            machine = null;

            try {
                const preview_machine = new TuringMachine(config);
                preview_machine.renderGraph()
                    .then((graph) => {
                        set_contents(machine_div, graph);
                    })
                    .catch(error => {
                        console.error(error);
                    });

                // rendered without errors
                machine_status_div.innerText = "Machine is OK";
                inspect_tab.classList.remove("disabled");
                halted = false;

                // update global machine
                machine = preview_machine;
            } catch (e) {
                // try rendering without validation
                try {
                    machine_status_div.innerText = `Error: ${e}`;

                    const preview_machine_no_validate = new TuringMachine(config, false);
                    preview_machine_no_validate.renderGraph()
                        .then((graph) => {
                            set_contents(machine_div, graph);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                } catch (e) {
                    // could not render preview without validation
                    show_error_dialog(e);
                }
            }
        } catch (e) {
            // failed parsing config
            show_error_dialog(e);
        }
    }, 100);
}

function toggle_machine() {
    const running = (animation != null);

    if (running) {
        // pause it
        stop_machine();
    } else {
        run_machine();
    }

    update_inspection_buttons();
}

function update_inspection_buttons() {
    const running = (animation != null);

    const run_pause_button = document.getElementById("run_pause_button");
    const run_pause_button_label = document.getElementById("run_pause_button_label");
    const advance_button = document.getElementById("advance_button");
    const reset_button = document.getElementById("reset_button");

    if (running) {
        run_pause_button.checked = true;
        run_pause_button_label.innerText = "Pause";
        run_pause_button.disabled = false;
        advance_button.disabled = true;
        reset_button.disabled = true;
    } else {
        if (halted) {
            run_pause_button.checked = true;
            run_pause_button.disabled = true;
            run_pause_button_label.innerText = "Halted";
            advance_button.disabled = true;
        } else {
            run_pause_button.disabled = false;
            run_pause_button.checked = false;
            run_pause_button_label.innerText = "Run";
            advance_button.disabled = false;
        }
        reset_button.disabled = false;
    }

    if (halted) {}
}

function on_load() {
    // attach event listeners to tab buttons
    const inspect_tab = document.getElementById("inspect-tab");

    inspect_tab.addEventListener('shown.bs.tab', function(event) {
        render_machine();
        update_inspection_buttons();
    });

    inspect_tab.addEventListener('hide.bs.tab', function(event) {
        console.log("hide", event.target.id);
    });
}