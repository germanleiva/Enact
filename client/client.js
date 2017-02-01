
var socket = io.connect('http://192.168.0.12:3000');

var draggable = document.getElementsByClassName("draggable")[0];

var isDragged = false;
var isPlayback = false;

var offset = { x: 0, y: 0 };

var initialPosition = { x: document.body.clientWidth / 2 - draggable.offsetWidth / 2, y: document.body.clientHeight / 2 - draggable.offsetHeight / 2 };

moveDraggableToInitialPosition()

var eventsCache = [];

function saveEvent(anEvent) {
    var anEvent = { type: anEvent.type, pageX: anEvent.pageX, pageY: anEvent.pageY, timeStamp: anEvent.timeStamp, window: {width: window.outerWidth, height: window.outerHeight } }
    socket.emit('send', { message: anEvent });

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

    var isInsideWidth = event.pageX > draggable.offsetLeft && event.pageX < (draggable.offsetLeft + draggable.offsetWidth);
    var isInsideHeight = event.pageY > draggable.offsetTop && event.pageY < (draggable.offsetTop + draggable.offsetHeight);

    if (isInsideWidth && isInsideHeight) {
        // console.log("mousedown");

        isDragged = true;

        offset.x = event.pageX - draggable.offsetLeft;
        offset.y = event.pageY - draggable.offsetTop;

        if (!isPlayback) {
            saveEvent(event);
        }
    }
});

document.addEventListener("touchmove", function (event) {
    if (isDragged) {
        // console.log("mousemove");

        // console.log("x: " + event.pageX);
        // console.log("y: " + event.pageY);
        draggable.style.left = (event.pageX - offset.x) + "px";
        draggable.style.top = (event.pageY - offset.y) + "px";

        if (!isPlayback) {
            saveEvent(event);
        }
    }
});

document.addEventListener("touchend", function (event) {
    if (isDragged) {
        // console.log("mouseup");
        isDragged = false;
        if (!isPlayback) {
            saveEvent(event);
        }
    }
});

function playEvents() {
    if (eventsCache.length == 0) {
        alert("No gesture recorded");
        return;
    }

    moveDraggableToInitialPosition();

    isPlayback = true;

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

function resetFigure() {
    moveDraggableToInitialPosition();
    eventsCache = [];
    isPlayback = false;
}

function moveDraggableToInitialPosition() {
    draggable.style.left = initialPosition.x + "px";
    draggable.style.top = initialPosition.y + "px";
}

