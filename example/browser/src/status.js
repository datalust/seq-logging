/*
Debounce status messages to the UI so users can see the status
of our log event in flight.
*/

let update = null;
let next = null;

const setStatus = (message) => {
    const status = document.getElementById('status');
    
    status.innerText = message;
    status.focus();
}

export default (message) => {
    // If we haven't set the status message then set it immediately
    if (update === null) {
        setStatus(message);

        update = window.setTimeout(() => {
            update = null;

            if (next !== null) {
                next();
                next = null;
            }
        }, 3000);
    }
    // If we have set the status message then debounce it
    // to give readers a chance to see it
    else {
        next = () => {
            setStatus(message);
        };
    }
}
