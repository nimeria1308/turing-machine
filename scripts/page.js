var machine = null;

function on_turing_json_selected(file_input) {
    const f = file_input.files[0];
    if (f) {
        const reader = new FileReader();

        reader.onload = function(evt_reader) {
            // parse JSON
            const j = JSON.parse(evt_reader.target.result);
            machine = new TuringMachine(
                j.states, j.start, j.halt,
                j.symbols, j.empty_symbol,
                j.rules);

            const machine_div = document.getElementById("machine");

            function append_graphics(graph) {
                while (machine_div.lastElementChild) {
                    machine_div.removeChild(machine_div.lastElementChild);
                }
                machine_div.appendChild(graph);
            }

            function render_machine() {
                if (machine.advance()) {
                    machine.renderGraph()
                        .then((graph) => {
                            append_graphics(graph);
                            setTimeout(render_machine, 1000);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }
            }

            machine.renderGraph()
                .then((graph) => {
                    append_graphics(graph);

                    // start auto-update
                    setTimeout(render_machine, 1000);
                })
                .catch(error => {
                    console.error(error);
                });
        };

        reader.readAsText(f);
    }
}