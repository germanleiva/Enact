<template>
  <div id="app">
    <toolbar></toolbar>
    <div id="upperArea" style="display:flex">
        <visual-state-canvas :visual-state-model="deviceVisualState" class="mirror" style="position:relative" draggable="true" :is-mirror="true">
        </visual-state-canvas>
        <output-area ref="outputArea"></output-area>
    </div>
    <input-area></input-area>
    <code-area></code-area>
  </div>
</template>

<script>
import Vue from 'vue'
import {extendArray} from './collections.js'
extendArray(Array);

import VueD3 from 'vue-d3'
Vue.use(VueD3)

import {globalStore, globalBus, VisualStateModel, InputEvent} from './store.js'
import Toolbar from './components/Toolbar.vue'
import OutputArea from './components/OutputArea.vue'
import InputArea from './components/InputArea.vue'
import VisualStateCanvas from './components/VisualStateCanvas.vue'
import CodeArea from './components/CodeArea.vue'

export default {
  name: 'app',
  data () {
    return {
        canvasWidth: globalStore.mobileWidth,
        canvasHeight: globalStore.mobileHeight,
        deviceVisualState: new VisualStateModel()
    }
  },
  components: {
    Toolbar,
    OutputArea,
    InputArea,
    CodeArea,
    VisualStateCanvas
  },
  mounted: function() {
    globalBus.$on('message-from-device-CURRENT_EVENT', function(data) {
        // console.log("TYPE OF EVENT " + data.message.type + " data: " + JSON.stringify(data))
        this.deviceVisualState.currentInputEvent = new InputEvent(data.message)
    }.bind(this));

    globalBus.$on('didRecordingChanged',function(isRecording) {
        console.log("didRecordingChanged " + isRecording)
        this.deviceVisualState.showAllInputEvents = isRecording
    }.bind(this));

    globalStore.socket.emit('message-from-desktop', { type: "CLEAN", message: {} })

    globalBus.$on('message-from-device-SHAPE_CREATED',function(data) {
        //If the deviceVisualState has the shape then we edit else we create
        // console.log("SHAPE_CREATED json: " + JSON.stringify(data.shapeJSON))
        let deviceEditedShapeId = data.shapeJSON.id
        if (!this.deviceVisualState.shapesDictionary[deviceEditedShapeId]) {
            let myEditedShape = this.deviceVisualState.addNewShape(data.shapeType,deviceEditedShapeId)
            myEditedShape.fromJSON(data.shapeJSON)
        } else {
            console.log("We already have that SHAPE? WEIRD")
        }
    }.bind(this));

    globalBus.$on('message-from-device-SHAPE_CHANGED',function(data) {
        //If the deviceVisualState has the shape then we edit else we create
        // console.log("SHAPE_CHANGED json: " + JSON.stringify(data.shapeJSON))
        let deviceEditedShapeId = data.shapeJSON.id

        if (this.deviceVisualState.shapesDictionary[deviceEditedShapeId]) {
            let myEditedShape = this.deviceVisualState.shapesDictionary[deviceEditedShapeId]

            myEditedShape.fromJSON(data.shapeJSON)
        } else {
            console.log("We are editing a shape that we don't have. WEIRD")
        }
    }.bind(this))

    globalBus.$on('message-from-device-SHAPE_DELETED',function(data) {
        //If the deviceVisualState has the shape then we edit else we create
        // console.log("SHAPE_DELETED json: " + JSON.stringify(data))
        let deviceEditedShapeId = data.id

        if (this.deviceVisualState.shapesDictionary[deviceEditedShapeId]) {
            Vue.delete(this.deviceVisualState.shapesDictionary, deviceEditedShapeId)
        } else {
            console.log("We are deleting a shape that we don't have. WEIRD")
        }
    }.bind(this))

    // this.prepareCanvas()
    var that = this;
    window.addEventListener('keydownxxx', function(e) {
        // e.preventDefault()
        if (e.target.tagName == "INPUT") {
            //ignore
            return
        }

        let arrowDisplacement = 1;
        console.log("keydown keyCode: " + e.keyCode)

        switch(e.keyCode) {
            case 16:{
                //ShiftLeft & ShiftRight
                e.preventDefault()
                globalStore.toolbarState.multiSelectionMode = true;
                break;
            }
            case 17:{
                //Ctrl
                e.preventDefault()
                break;
            }
            case 18:{
                //AltLeft & AltRight
                e.preventDefault()
                break;
            }
            case 38:{
                // up arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(0,-arrowDisplacement)
                break;
            }
            case 40:{
                // down arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(0,arrowDisplacement)
                break;
            }
            case 37:{
               // left arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(-arrowDisplacement,0)
               break;
            }
            case 39:{
               // right arrow
                e.preventDefault()
                that.$refs.outputArea.moveSelectedShapes(arrowDisplacement,0)
               break;
            }
            case 46: {
                // MAC delete key
                e.preventDefault()
                if (!that.$refs.outputArea) {
                    debugger;
                }
                that.$refs.outputArea.deleteSelectedShapes()
                break;
            }
        }
    });
    window.addEventListener('keyup', function(e) {
        switch(e.keyCode) {
            case 16: {
                //ShiftLeft & ShiftRight
                e.preventDefault()
                globalStore.toolbarState.multiSelectionMode = false;
                break;
            }
            case 17:{
                //Ctrl
                e.preventDefault()
                break;
            }
            case 18:{
                //AltLeft & AltRight
                e.preventDefault()
                break;
            }
        }
    });
    window.addEventListener('onContextMenu', function(e) {
        e.preventDefault();
    })

  },
  computed: {

  },
  methods: {
    mirrorDragged(event) {
        event.dataTransfer.setData("text/visual-state", "");
        console.log("Started dragging mirror mobile");
    },
    // prepareCanvas() {
    //     globalStore.context = document.getElementById('myCanvas').getContext("2d");

    //     globalStore.context.fillStyle = "#9ea7b8";
    //     globalStore.context.fillRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
    //     // globalStore.context.strokeStyle = "#df4b26";
    //     // globalStore.context.lineJoin = "round";
    //     // globalStore.context.lineWidth = 5;

    //     // globalStore.context.moveTo(0, 0);
    //     // globalStore.context.lineTo(200, 100);
    //     // globalStore.context.stroke();
    // },
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
    margin: 6px;
    position: relative;
}

.mirror:hover{
    border-color: #aaaaaa;
    cursor: move;
}

.visualStateContainer {
    display: flex; /*This will make the diff container change the width (maybe this is not desired)*/
}

.diffContainer{
    margin-top: 5px;
    width: 126px;
    display: flex; /*This is to align the diff button and the diff box*/
    flex-direction: row; /*To have the child vertically align*/
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
    background-color: #eeeeee;
    display: flex; /*This doesn't work with block*/
    width: 100%;
    /*I need to put the white space
    in order to get the scrolling to work*/
    overflow-x : scroll;
    white-space: nowrap;
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

#inputArea {
    display: flex;
    justify-content:center;
    padding: 8px;
}

#lowerArea{
    background-color: #eeeeee;
}
</style>
