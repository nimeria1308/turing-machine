let machine = null;

function on_turing_json_selected(file_input) {
    const f = file_input.files[0];
    if (f) {
        const reader = new FileReader();

        reader.onload = function(evt_reader) {
            // parse JSON
            const j = JSON.parse(evt_reader.target.result);
            machine = new TuringMachine(j.states, j.start, j.halt, j.symbols, j.rules);
        };

        reader.readAsText(f);
    }
}