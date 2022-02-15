// Copyright (C) 2022 Simona Dimitrova

/**
 * Current machine being visualized
 */
var machine = null;

/**
 * Result of setInterval used to advance the machine and render
 * it automatically at prediterminate intervals.
 *
 * This is created when tapping the "Run" button.
 */
var animation = null;

/**
 * Used to store the "halted" state of the current machine.
 * It is true if the machine cannot advance, because:
 *   - The machine has entered a "halted" state.
 *   - Advancing the machine has produced an error.
 */
var halted = false;

/**
 * Stores the result of setTimeout for creating the "preview" graph on
 * the "Configure" tab.
 *
 * It is there so that the graph is not generated at once, but after a short delay.
 * This is needed because the graph needs to be recreated every time the input controls on
 * the "Configure" tab change. Doing it there may hurt performance, if the inputs
 * are changed very quickly (e.g. when typing text into the "Rules" text area). Instead,
 * it schedules a callback function to be called a little later, which can be cancelled,
 * if the input changed quickly inbetween.
 */
var preview = null;

/**
 * A helper function useed to clear the contents of an element,
 * and set another element as its only child.
 * @param element   The element which contents should be set.
 * @param contents  The element which is going to be the only child.
 */
function set_contents(element, contents) {
    // clear all children
    while (element.lastElementChild) {
        element.removeChild(element.lastElementChild);
    }

    // append "contents" as the only child of "element"
    element.appendChild(contents);
}

/**
 * A helper function used to display an "error" modal dialog box.
 * It uses "bootstrap" to display the dialog.
 * @param error The error to be displayed.
 */
function show_error_dialog(error) {
    // Get modal element from HTML
    const modal_element = document.getElementById("modal_error");

    // Create a new modal "bootstrap" object for that element
    const modal = new bootstrap.Modal(modal_element);

    // Update element's contents for error message within dialog box
    const modal_message = document.getElementById("modal_error_message");
    modal_message.innerText = error;

    // Log error to console: it may be more descriptive and useful for debugging
    console.log(error);

    // Display the error dialog
    modal.show();
}

/**
 * Filename used to fill in default name in the "Save file" dialog.
 * It is updated if a machine is loaded from file or from the samples list.
 */
var filename = "turing_machine.json";

/**
 * Loads a machine from a config object:
 *  1. Validate the config and handle optinal keys.
 *  2. Fill in input elements in the "Configure" tab.
 *  3. Schedules to create preview machine and display the preview graph.
 *
 * @param config The config object for which the machine is created.
 */
function load_machine_from_config(config) {
    // make sure the "start" key is present in config
    if (!("start" in config)) {
        throw `"start" key missing in '${f.name}'`;
    }

    // fill in "start" input element in HTML
    const start = document.getElementById("machine_start");
    start.value = config.start;

    // fill in "halt" input element if "halt" key is present (optional)
    const halt = document.getElementById("machine_halt");
    halt.value = ("halt" in config) ? config.halt.join(",") : "";

    // make sure the "empty_symbol" key is present in config
    if (!("empty_symbol" in config)) {
        throw `"empty_symbol" key missing in '${f.name}'`;
    }

    // fill in "empty_symbol" input element in HTML
    const empty_symbol = document.getElementById("machine_empty_symbol");
    empty_symbol.value = config.empty_symbol;

    // fill in "tape" input element if "tape" key is present (optional)
    const tape = document.getElementById("machine_tape");
    tape.value = ("tape" in config) ? config.tape : "";

    // make sure the "rules" key is present in config
    if (!("rules" in config)) {
        throw `"rules" key missing in '${f.name}'`;
    }

    // fill in "rules" input element in HTML
    const rules = document.getElementById("machine_rules");
    rules.value = config.rules.join("\n");

    // update preview machine and graph
    schedule_preview();
}

/**
 * A callback function, called from HTML when the file input element changes, i.e.
 * when the user selects a new file.
 *
 * It loads a turing machine, described in a JSON file via parsing the
 * selected file as JSON and then passing it to load_machine_from_config()
 *
 * @param file file HTML element
 */
function file_changed(file) {
    const f = file.files[0];
    if (f) {
        // Only proceed if a file was actually selected by the user
        const source = document.getElementById("machine_source");

        // Ask the user for confirmation to load the machine.
        // This is required, because this will overwrite the input fields.
        if (confirm("Are you sure you want to replace the loaded machine?")) {
            // Use a FileReader to load the contents of the selected file
            const reader = new FileReader();

            // Set up callback for FileReader to be called,
            // when the file contents have been read successfully.
            reader.onload = function(event) {
                // Update the global filename variable for the "Save" dialog.
                filename = f.name;

                // Stop the machine if currently being animated.
                stop_machine();

                try {
                    // Parse as JSON into a config object
                    const config = JSON.parse(event.target.result);

                    // load machine into HTML and display preview machine
                    load_machine_from_config(config);
                } catch (e) {
                    // Something happened:
                    //  1. Could not parse as correct JSON
                    //  2. Machine could not be loaded from config (e.g. missing required keys)
                    // Present error dialog with error
                    show_error_dialog(e);
                }
            };

            // Now the FileReader is fully set up, read its contents as text data
            reader.readAsText(f);
        }
    }
}

/**
 * A callback function, called from HTML whenever the selected element in the
 * "machine sample" select changes.
 *
 * Acts similarly to "file_changed", but retrieves its JSON data from an AJAX
 * request, instead of a file selector element.
 *
 * @param sample The "machine sample" select HTML element.
 */
function sample_changed(sample) {
    if (sample.value == "") {
        // Nothing selected, this is the "Choose sample" option from HTML.
        return;
    }

    // Ask the user for confirmation to load the machine.
    // This is required, because this will overwrite the input fields.
    if (confirm("Are you sure you want to replace the loaded machine?")) {
        // Update the global filename variable for the "Save" dialog.
        filename = `${sample.value}.json`;

        // Load sample via fetch (the new ajax)
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
        const url = `examples/${sample.value}.json`;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw `Could not download ${url}`;
                }

                // Parse as JSON into a config object
                // Returns promise, needs another "then"
                return response.json();
            })
            .then(config => {
                // load machine into HTML and display preview machine
                load_machine_from_config(config);
            })
            .catch(e => {
                // Something happened:
                //  1. Could not download file from URL
                //  2. Could not parse as correct JSON
                //  3. Machine could not be loaded from config (e.g. missing required keys)
                // Present error dialog with error
                show_error_dialog(e);
            });
    } else {
        // Cancelled, remove choice
        sample.value = "";
    }
}

/**
 * Construct a config object from the data in the input elements in HTML.
 * This is the "reverse" of load_machine_from_config.
 *
 * @returns a config object to be used when creating a new TuringMachine
 */
function config_from_inputs() {
    // Create an empty result object
    const config = {};

    // Fill in the "rules" key in config from HTML input
    const rules_input = document.getElementById("machine_rules");
    config.rules = [];

    // Each rule is on a separate line
    for (let rule of rules_input.value.split("\n")) {
        // Skip empty lines
        if (rule != "") {
            // Each rule is a tuple of 5 elements.
            // In HTML, those elements are separated by comma.
            config.rules.push(rule.split(","));
        }
    }

    // Fill in the "start" key in config from HTML input
    const start_input = document.getElementById("machine_start");
    config.start = start_input.value;

    // Fill in the "empty_symbol" key in config from HTML input
    const empty_symbol_input = document.getElementById("machine_empty_symbol");
    config.empty_symbol = empty_symbol_input.value;

    // Fill in the "halt" key in config from HTML input, only if not empty as it is optional
    // It can contain multiple "halt" states, separated by comma.
    const halt_input = document.getElementById("machine_halt");
    if (halt_input.value) {
        config.halt = halt_input.value.split(",");
    }

    // Fill in the "tape" key in config from HTML input, only if not empty as it is optional
    const tape_input = document.getElementById("machine_tape");
    if (tape_input.value) {
        config.tape = tape_input.value;
    }

    return config;
}

/**
 * A function used to download the machine config into a file.
 */
function save_machine() {
    try {
        // Construct a config from HTML inputs
        const config = config_from_inputs();

        // Ask for filename for download. Use default from global variable "filename"
        const entered_filename = prompt("Enter filename for turing machine", filename);

        // Make sure the user actually entered a filename and did not cancel the dialog
        if (entered_filename != null) {
            // Update global variable with user input
            filename = entered_filename;

            // If user did not input any text, but did not cancel the dialog
            // select default filename
            filename = "turing_machine.json";

            // Make sure entered filename has the .json extension
            if (!filename.endsWith(".json")) {
                filename = filename + ".json";
            }

            // Generate JSON from config object
            const text = JSON.stringify(config, null, 4);

            // See https://github.com/eligrey/FileSaver.js#saving-text
            // 1. Create a "Blob" from the JSON text. This is required by "saveAs" from FileSaver.
            // 2. Provide correct MIME type for JSON files and use UTF-8 for compatibility.
            // 3. Call "saveAs" from FileSaver external JavaScript.
            const blob = new Blob([text], { type: "application/json;charset=utf-8" });
            saveAs(blob, filename);
        }
    } catch (e) {
        // Make sure to display proper error dialog if something fails
        show_error_dialog(e);
    }
}

/**
 * Stops the machine from running, i.e. it will not automatically advance and render.
 */
function stop_machine() {
    if (animation != null) {
        clearInterval(animation);
        animation = null;
    }
}

/**
 * Function used to render the machine in the "Inspect" tab.
 * It renders its graph, current operation and rule table.
 *
 * @param on_render A callback function called after rendering.
 *                  Mainly used when machine is being run.
 */
function render_machine(on_render = null) {
    const machine_div = document.getElementById("machine");
    const tape_div = document.getElementById("tape");
    const operation_div = document.getElementById("operation");
    const rules_div = document.getElementById("rules");

    // Render the machine's graph first as it requires a callback.
    machine.renderGraph(function(graph) {
        try {
            // Update contents of machine-related elements on "Inspect" tab.
            set_contents(machine_div, graph);
            set_contents(tape_div, machine.renderTape());
            set_contents(operation_div, machine.render_operation());
            set_contents(rules_div, machine.render_rules());

            // Invoke callback if provided
            if (on_render != null) {
                on_render();
            }
        } catch (error) {
            // Handle error gracefully.
            // The main source of error would be advancing the machine and
            // having a missing rule.

            // Stop the animation
            stop_machine();

            // Set the halted state: The machine cannot advance
            halted = true;

            // Make sure the inspection toolbar is up-to-date
            update_inspection_buttons();

            // Finally display the error to the user
            show_error_dialog(error);
        }
    });
}

/**
 * Run the current machine. This sets up an interval that advances and renders the machine
 * @param speed Interval in milliseconds at which the machine should advance
 */
function run_machine(speed) {
    // Make sure the machine is not running
    stop_machine();

    // Clear halted state
    halted = false;

    // Set up interval to be called each "speed" milliseconds
    animation = setInterval(function() {
        // Render the machine each "speed" seconds
        render_machine(function() {
            // Callback to be invoked after machine is rendered
            // Try advancing the machine
            if (!machine.advance()) {
                // Machine could not advance, thus entered a "halt" state

                // Stop the animation
                stop_machine();

                // Set the halted state
                halted = true;

                // Make sure the inspection toolbar is up-to-date
                update_inspection_buttons();
            }
        });
    }, speed);
}

/**
 * Function used to:
 *  - Verify the machine being configured
 *  - Render a preview graph
 *  - Update "validation" badges
 */
function schedule_preview() {
    // Make sure animation is not running
    stop_machine();

    // Clear the current machine, as we are creating a new one
    machine = null;

    // Disable "inspection tab", until passes verification
    const inspect_tab = document.getElementById("inspect-tab");
    inspect_tab.classList.add("disabled");

    // Clear previous "preview" requests
    if (preview != null) {
        clearTimeout(preview);
        preview = null;
    }

    // Queue a preview request to be done in some time.
    // The preview request can be cancelled if "schedule_preview" is called in between
    preview = setTimeout(() => {
        const machine_div = document.getElementById("machine_preview");
        const machine_status = document.getElementById("machine_preview_status");
        const machine_error = document.getElementById("machine_preview_error");

        try {
            const config = config_from_inputs();
            machine = null;

            try {
                // Try creating and rendering a machine for the current inputs.
                const preview_machine = new TuringMachine(config);
                preview_machine.renderGraph(function(graph) {
                    try {
                        set_contents(machine_div, graph);
                    } catch (error) {
                        console.error(error);
                    }
                });

                // Rendered without errors

                // Update "validation" information
                machine_status.innerText = "Machine is valid";
                machine_status.className = "badge bg-success";
                machine_error.innerText = "";

                // Enable "Inspect" tab
                inspect_tab.classList.remove("disabled");

                // Clear halted state, machine is ready
                halted = false;

                // Update global machine that is used for inspection
                machine = preview_machine;
            } catch (e) {
                // Validation failed
                try {
                    // Update "validation" information
                    machine_status.innerText = "Failed";
                    machine_status.className = "badge bg-danger";
                    machine_error.innerText = e;

                    // Try rendering without validation, so that some graph can still
                    // be presented to the user
                    const preview_machine_no_validate = new TuringMachine(config, false);
                    preview_machine_no_validate.renderGraph(function(graph) {
                        try {
                            set_contents(machine_div, graph);
                        } catch (error) {
                            console.error(error);
                        }
                    });
                } catch (e) {
                    // Could not render preview without validation
                    show_error_dialog(e);
                }
            }
        } catch (e) {
            // Failed parsing config
            show_error_dialog(e);
        }
    }, 100);
}

/**
 * Used to toggle the current machine state between running and paused (stopped).
 */
function toggle_machine() {
    // If "animation" interval is present, the machine is running
    const running = (animation != null);

    if (running) {
        // Pause it
        stop_machine();
    } else {
        // Get animation speed
        const speed_button = document.querySelector('input[name="speed"]:checked');
        const speed = parseInt(speed_button.value);

        // Run the machine
        run_machine(speed);
    }

    // Make sure the inspection toolbar is up-to-date
    update_inspection_buttons();
}

/**
 * Updates the buttons of the inspection toolbar to reflect the
 * state of the current machine
 */
function update_inspection_buttons() {
    // If "animation" interval is present, the machine is running
    const running = (animation != null);

    const run_pause_button = document.getElementById("run_pause_button");
    const run_pause_button_label = document.getElementById("run_pause_button_label");
    const advance_button = document.getElementById("advance_button");
    const reset_button = document.getElementById("reset_button");
    const speed_buttons = document.getElementsByName("speed");

    if (running) {
        // Make sure run/pause button is enabled,
        // and it is in the "paused" state
        run_pause_button.checked = true;
        run_pause_button_label.innerText = "Pause";
        run_pause_button.disabled = false;

        // Disable buttons not available during animation
        advance_button.disabled = true;
        reset_button.disabled = true;
        for (let s of speed_buttons) {
            s.disabled = true;
        }
    } else {
        // Enable all buttons for selecting running speed
        for (let s of speed_buttons) {
            s.disabled = false;
        }

        if (halted) {
            // Machine has halted and cannot continue
            // Disable all buttons related to running
            run_pause_button.checked = true;
            run_pause_button.disabled = true;
            run_pause_button_label.innerText = "Halted";
            advance_button.disabled = true;
        } else {
            // Machine not halted
            // Enable all buttons related to running
            run_pause_button.disabled = false;
            run_pause_button.checked = false;
            run_pause_button_label.innerText = "Run";
            advance_button.disabled = false;
        }

        // Reset button should always be available if machine is not running
        reset_button.disabled = false;
    }
}

/**
 * Advance machine
 */
function advance_machine() {
    try {
        if (!machine.advance()) {
            // Entered a "halt" state
            halted = true;
            update_inspection_buttons();
        }

        // Render the machine
        render_machine();
    } catch (e) {
        // Something happened when trying to advance.
        // Perhaps a missing rule.
        // Halt the machine and display the error.
        halted = true;
        update_inspection_buttons();
        show_error_dialog(e);
    }
}

/**
 * Reset the machine into its initial state
 */
function reset_machine() {
    machine.reset();
    halted = false;
    update_inspection_buttons();
    render_machine();
}

/**
 * Called when the HTML page has loaded
 */
function on_load() {
    const inspect_tab = document.getElementById("inspect-tab");

    // Attach event listeners to "inspect" tab button
    // https://getbootstrap.com/docs/5.0/components/navs-tabs/#events
    inspect_tab.addEventListener("shown.bs.tab", function(event) {
        // Render the machine and update the inspect toolbar,
        // as soon as the user has opened this tab.
        render_machine();
        update_inspection_buttons();
    });

    // Add copyright notice
    const copyright = document.getElementById("copyright");
    const year = new Date().getFullYear();
    copyright.innerText = `Copyright \u00A9 ${year} Simona Dimitrova`;
}