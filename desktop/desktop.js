var eventsCache = [];
var draggable = document.getElementsByClassName("draggable")[0];
var isDragged = false;
var isPlayback = false;
var offset = { x: 0, y: 0 };
var initialPosition = { x: 0, y: 0 }
var socket = io.connect('http://localhost:3000');

socket.on('message', function (data) {
    if (data.message) {
        eventsCache.push(data.message);
    } else {
        console.log("There is a problem:", data);
    }
});

window.onload = function () {
    draggable = document.getElementsByClassName("draggable")[0];

    initialPosition.x = window.outerWidth / 2 - draggable.offsetWidth / 2;
    initialPosition.y = window.outerHeight / 2 - draggable.offsetHeight / 2;

    moveDraggableToInitialPosition();

    //To drag
    document.addEventListener("mousedown", function (event) {
            console.log("mousedown");

        var isInsideWidth = (event.pageX > draggable.offsetLeft) && event.pageX < (draggable.offsetLeft + draggable.offsetWidth);
        var isInsideHeight = (event.pageY > draggable.offsetTop) && event.pageY < (draggable.offsetTop + draggable.offsetHeight);

        // if (isInsideWidth && isInsideHeight) {

            isDragged = true;

            offset.x = event.pageX - draggable.offsetLeft;
            offset.y = event.pageY - draggable.offsetTop;
        // }
    });

    document.addEventListener("mousemove", function (event) {
        if (isDragged) {
            console.log("mousemove");

            // console.log("x: " + event.pageX);
            // console.log("y: " + event.pageY);
            draggable.style.left = (event.pageX - offset.x) + "px";
            draggable.style.top = (event.pageY - offset.y) + "px";
        }
    });

    document.addEventListener("mouseup", function (event) {
        if (isDragged) {
            console.log("mouseup");
            isDragged = false;
        }
    });
}

function playEvents() {
    console.log("Play events pressed");
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

        dispatchWaiting(cachedEventObject, waitingTime, isLast);
    }
}

function dispatchWaiting(aCachedEventObject, waitingTime, isLast) {
    setTimeout(function () {
         var pDict = {"touchstart":"mousedown","touchmove":"mousemove","touchend":"mouseup"};
         var newType = pDict[aCachedEventObject.type];
        console.log(newType);

        var newEvent = new MouseEvent(newType, { clientX: aCachedEventObject.pageX, clientY: aCachedEventObject.pageY });

        // cachedEventObject.timeStamp = new Date().getTime();
        // var result = document.dispatchEvent(aCachedEventObject);
        console.log(JSON.stringify(newEvent));
        var result = document.dispatchEvent(newEvent);

        console.log("Event result: " + result);

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