<template>
  <div id="app">
    <toolbar></toolbar>
    <output-area ref="outputArea"></output-area>
    <input-area><input-area>
  </div>
</template>

<script>
import {globalStore} from './store.js'
import Toolbar from './components/Toolbar.vue'
import OutputArea from './components/OutputArea.vue'
import InputArea from './components/InputArea.vue'

if (!Array.prototype.first) {
    Array.prototype.first = function() {
        return this[0];
    }
}
if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    }
}
if (!Array.prototype.removeAll) {
    Array.prototype.removeAll = function() {
        return this.splice(0, this.length);
    }
}

export default {
  name: 'app',
  data () {
    return {

    }
  },
  components: {
    'toolbar': Toolbar,
    'output-area': OutputArea,
    'input-area': InputArea
  },
  mounted: function() {
    globalStore.socket.emit('message-from-desktop', { type: "CLEAN", message: {} })

    this.prepareCanvas()
    var that = this;
    window.addEventListener('keydown', function(e) {
        // e.preventDefault()
        let arrowDisplacement = 1;
        console.log("keydown keyCode: " + e.keyCode)

        switch(e.keyCode) {
            case 18:
                //AltLeft & AltRight
                e.preventDefault()
                globalStore.toolbarState.multiSelectionMode = true;
                break;
            case 38:
                // up arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
                break;
            case 40:
                // down arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(0,arrowDisplacement)
                break;
            case 37:
               // left arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(-arrowDisplacement,0)
               break;
            case 39:
               // right arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(arrowDisplacement,0)
               break;
            case 46:
                // MAC delete key
                e.preventDefault()
                if (!that.$refs.outputArea) {
                    debugger;
                }
                that.$refs.outputArea.deleteSelectedShapes()
                break;
        }
    });
    window.addEventListener('keyup', function(e) {
        switch(e.keyCode) {
            case 18:
                //AltLeft & AltRight
                e.preventDefault()
                globalStore.toolbarState.multiSelectionMode = false;
                break;
        }
    });

  },
  methods: {
    changeColorOfSelectedShapes(cssStyle) {
        this.$refs.outputArea.changeColorOfSelectedShapes(cssStyle)
    },
    prepareCanvas() {
        let newCanvasElement = document.createElement('canvas');
        newCanvasElement.setAttribute('id','myCanvas');
        newCanvasElement.setAttribute('width','375');
        newCanvasElement.setAttribute('height','667');
        this.$el.appendChild(newCanvasElement)
        globalStore.context = newCanvasElement.getContext("2d");

        globalStore.context.fillStyle = "#9ea7b8";
        globalStore.context.fillRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
        // globalStore.context.strokeStyle = "#df4b26";
        // globalStore.context.lineJoin = "round";
        // globalStore.context.lineWidth = 5;

        // globalStore.context.moveTo(0, 0);
        // globalStore.context.lineTo(200, 100);
        // globalStore.context.stroke();

        function drawTouches() {
            let points = globalStore.inputEvents;
            globalStore.context.clearRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
            globalStore.context.lineWidth = 3;
            for (let i = 1; i < points.length; i++) {
                for (let j = 0; j < Math.max(Math.min(points[i - 1].touches.length, points[i].touches.length), 1); j++) {
                    globalStore.context.beginPath();
                    globalStore.context.moveTo(points[i - 1].touches[j].x, points[i - 1].touches[j].y);
                    globalStore.context.lineTo(points[i].touches[j].x, points[i].touches[j].y);
                    globalStore.context.strokeStyle = "black";
                    globalStore.context.stroke();
                }
            }
        }

        let amountOfTouchesLeft = 0

        globalStore.socket.on('message-from-server', function(data) {
            // console.log(data)
            let anInputEvent = data.message

            if (anInputEvent.type == 'touchend') {
                amountOfTouchesLeft -= 1;
                if (amountOfTouchesLeft == 0) {
                    globalStore.isRecording = false
                    globalStore.socket.emit('message-from-desktop', { type: "STOP_RECORDING", message: undefined })
                }
            } else {
                amountOfTouchesLeft = Math.max(amountOfTouchesLeft, anInputEvent.touches.length)

                if (anInputEvent.type == "touchstart") {
                    globalStore.inputEvents.removeAll();
                } else if (anInputEvent.type == 'touchmove') {
                    drawTouches()
                } else {
                    console.log("UNKNOWN INPUT TYPE");
                }
            }

            globalStore.inputEvents.push(anInputEvent);
        });
    },
    downArrowPressed(e){
        console.log("ARE YOU HERE???")
        this.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
    },
    keydownPressed(e) {
        let arrowDisplacement = 5;
        console.log("KEY DOWN EVENT " + typeof(e.keyCode))
        switch(e.keyCode) {
            case 'AltLeft':
            case 'AltRight':
                globalStore.toolbarState.multiSelectionMode = true;
                break;
            case 38:
                // up arrow
                this.$refs.outputArea.moveSelectedShapes(0,arrowDisplacement)
                break;
            case 40:
                // down arrow
                console.log("DOWN ARROW")
                this.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
                break;
            case 37:
               // left arrow
                this.$refs.outputArea.moveSelectedShapes(-arrowDisplacement,0)
               break;
            case 39:
               // right arrow
                this.$refs.outputArea.moveSelectedShapes(arrowDisplacement,0)
               break;
        }
    },
    keyupPressed(e) {
        globalStore.toolbarState.multiSelectionMode = false;
    }
  }
}

</script>

<style>
.visualStateCanvas {
    /*width: 375px;
    min-width: 375px; We are using flexbox so we shouldn't shrink below this width size
    height: 667px;*/
    background-color:white;
    border: 1px solid #333333;
    float:left;
    margin: 8px;
    position: relative;
}

.visualStateContainer {
    display: flex; /*This will make the diff container change the width (maybe this is not desired)*/
}

.diffContainer{
    width: 110px;
    display: flex; /*This is to align the diff button and the diff box*/
    flex-direction: column; /*To have the child vertically align*/
}

.visualStateDiff { /*MAybe we need to rename this as diffButton or shomething*/
     margin-top: 35px;
}

.diffBox {
    margin-top: 3px;
    /*I need to remove white space
    to keep the text inside*/
    white-space: normal;
}

.outputArea {
    height: 700px;
    background-color: #eeeeee;
    display: flex; /*This doesn't work with block*/
    width: 100%;
    /*I need to put the white space
    in order to get the scrolling to work*/
    overflow-x : scroll;
    white-space: nowrap;
}

.shapeHandler {
    width: 10px;
    height: 10px;
    background-color: #ffffff;
    border: 1px solid #000000;
    position:absolute;
}

#toolbar{
  display: block;
  padding-top: 5px;
    padding-bottom: 5px;

}

.is-active{
    background-color: #fafafa;
}

#title{
  font-family: futura;
  font-weight: 800;
}

.is-alone{
    margin-right: 10px;
    margin-left: 10px;
}

#color-picker{

}

.fa-rotate-45 {
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    -o-transform: rotate(45deg);
    transform: rotate(45deg);
}

.fa-rotate-135 {
    -webkit-transform: rotate(135deg);
    -moz-transform: rotate(135deg);
    -ms-transform: rotate(135deg);
    -o-transform: rotate(135deg);
    transform: rotate(135deg);
}

.inputTimeline {
    width: 100%;
    height: 40px;
    background-color: #CCC;
    position:relative;
    margin: 0px 5px; //0px top bottom and 5px left right
    border-radius: 3px;
}

.mark {
    width: 40px;
    height: 40px;
    position: absolute;
    text-align: center;
}

#timelineArea {
    display: flex;
    justify-content:center;
    padding: 8px;
}

#myCanvas {
    display: block;
    margin: 0 auto; /*centered */
}
</style>
