import Vue from 'vue'
import io from 'socket.io-client';

// import App from './App.vue'

require('bulma/css/bulma.css')
require('font-awesome/css/font-awesome.css')
require('./mobile.css')

// import store from './store.js'

let socket = io.connect(window.location.href.split('/')[2]);

var eventsCache = [];

function saveEvent(anEvent) {
    var anEvent = { type: anEvent.type, pageX: anEvent.pageX, pageY: anEvent.pageY, timeStamp: anEvent.timeStamp, window: {width: window.outerWidth, height: window.outerHeight } }
    socket.emit('message-from-device', { message: anEvent });

    eventsCache.push(anEvent);

    console.log("Sent: "+JSON.stringify(anEvent))
}

//To prevent scrolling - not working
// document.body.addEventListener('pointermove', function(event) {
//   event.preventDefault();
// }, false);

document.body.addEventListener('touchstart', function (e) { e.preventDefault(); });
document.body.addEventListener('touchmove', function (e) { e.preventDefault(); });
document.body.addEventListener('touchend', function (e) { e.preventDefault(); });

document.addEventListener("touchstart", function (event) {
            saveEvent(event);
});

document.addEventListener("touchmove", function (event) {
            saveEvent(event);
});

document.addEventListener("touchend", function (event) {
            saveEvent(event);
});

function playEvents() {
    if (eventsCache.length == 0) {
        alert("No gesture recorded");
        return;
    }

    moveDraggableToInitialPosition();

    var isLast = false;

    var initialTimeStamp = eventsCache[0].timeStamp;

    for (var i = 0; i < eventsCache.length; i++) {
        var cachedEventObject = eventsCache[i];

        if (i === eventsCache.length - 1) {
            isLast = true
        }

        var waitingTime = cachedEventObject.timeStamp - initialTimeStamp;

        // console.log("Event type: " + cachedEventObject.type + " Waiting time: " + waitingTime);
        // console.log("Location: " + cachedEventObject.pageX + " " + event.pageY);

        dispathWaiting(cachedEventObject, waitingTime, isLast);
    }
}

function dispathWaiting(aCachedEventObject, waitingTime, isLast) {
    setTimeout(function () {
        var newEvent = new MouseEvent(aCachedEventObject.type, { clientX: aCachedEventObject.pageX, clientY: aCachedEventObject.pageY });

        // cachedEventObject.timeStamp = new Date().getTime();
        // var result = document.dispatchEvent(aCachedEventObject);
        var result = document.dispatchEvent(newEvent);
        // console.log("Event result: " + result);

        if (isLast) {
            isPlayback = false;
        }

    }, waitingTime);
}

