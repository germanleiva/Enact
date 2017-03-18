<template>
    <div class='box rule-placeholder'>
        <input class="condition input" v-on:mouseup="mouseUpFor($event,'mainCondition')" placeholder="Main Condition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput" v-on:mouseup="mouseUpFor($event,'input')" :style="{ backgroundColor: activeColor }">
            <input class="input" v-model="rulePlaceholderModel.input.type" placeholder="Type">
            <input class="input" v-model="rulePlaceholderModel.input.id" placeholder="Id">
            <input class="MinMax min input" v-model="rulePlaceholderModel.input.min" v-on:mouseup="mouseUpFor($event,'input','min')" placeholder="m">
            <input class="MinMax max input" v-model="rulePlaceholderModel.input.max" v-on:mouseup="mouseUpFor($event,'input','max')" placeholder="M">
            <input class="input" v-model="rulePlaceholderModel.input.property" placeholder="Property">
            <!-- <input v-model="rulePlaceholderModel.input.axiss" style="width: 25%" placeholder="Input Axis"> -->
            <select v-model="rulePlaceholderModel.input.axiss" style="height:35px; width:50px" placeholder="Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>
        </div>
        <div class="factor">{{rulePlaceholderModel.factor}}</div>
        <div class="rightSide" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput" v-on:mouseup="mouseUpFor($event,'output')" :style="{ backgroundColor: activeColor }">
            <input class="input" v-model="rulePlaceholderModel.output.type" placeholder="Output Type">
            <input class="input" v-model="rulePlaceholderModel.output.id" placeholder="Output Id">
            <input class="input" v-model="rulePlaceholderModel.output.property" placeholder="Output Property">
<!--             <input v-model="rulePlaceholderModel.output.axiss" style="width: 25%" placeholder="Output Axis">
 -->
            <select v-model="rulePlaceholderModel.output.axiss" style="height:35px; width:50px" placeholder="Output Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>
            <input class="MinMax min input" v-model="rulePlaceholderModel.output.min" v-on:mouseup="mouseUpFor($event,'output','min')" placeholder="Min">
            <input class="MinMax max input" v-model="rulePlaceholderModel.output.max" v-on:mouseup="mouseUpFor($event,'output','max')" placeholder="Max">
        </div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,ShapeModel,InputEventTouch, DiffModel} from '../store.js'

let ContextMenu = Vue.extend({
    template: `<div :style="styleObject">
    <p class="menu-label">
        Select property
      </p>
      <ul class="menu-list">
        <li v-for="eachProperty in properties"><a v-on:click="clickedOn(eachProperty)">{{eachProperty}}</a><li>
      </ul>
      </div>`,
      data: function() {
        return {
            startingX: 0,
            startingY: 0,
            onSelectedProperty: undefined,
            properties: ['translation','scaling','color']
        }
      },
      computed: {
        styleObject: function() {
            return {
                left: this.startingX + 'px',
                top: this.startingY + 'px',
                position: 'absolute',
                'background-color': 'white'
            }
        }
      },
      methods: {
        clickedOn: function(propertyName) {
            this.onSelectedProperty(propertyName,['y'])
        }
      }
});

const acceptedInputTypes = ["text/diff-touch","text/diff-measure"]
const acceptedOutputTypes = ["text/diff-shape"]

export default {
    name: 'rule-placeholder',
    props:['rulePlaceholderModel'],
    data: function() {
        return {
            isActive: false
        }
    },
    watch: {
        rulePlaceholderModel: {
            handler: function(newValue,oldValue) {
                console.log('rulePlaceholderModel changed to '+newValue+" ("+oldValue+")");
                globalStore.socket.emit('message-from-desktop', { type: "EDIT_RULE", message: newValue })
            },
            deep: true
        }
    },
    methods: {
        dropForInput(event) {
            event.preventDefault();

            var dataType = this.draggedTypeFor(event.dataTransfer,acceptedInputTypes)
            var data = event.dataTransfer.getData(dataType);
            if (!data) {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
                return
            }
            console.log("dropForOutput >> " + data)

            let diffModel = new DiffModel(JSON.parse(data))

            diffModel.loadRulePlaceholder(this.rulePlaceholderModel.input)

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[diffModel.visualStateIndex]

                let outputBefore = visualState.shapesDictionary[this.rulePlaceholderModel.output.id]
                let outputAfter = visualState.nextState.shapesDictionary[this.rulePlaceholderModel.output.id]

                this.calculateFactor(this.rulePlaceholderModel.input.property,this.rulePlaceholderModel.output.property,diffModel.property.before,diffModel.property.after,outputBefore[this.rulePlaceholderModel.output.property],outputAfter[this.rulePlaceholderModel.output.property])
            }

        },
        dropForOutput(event) {
            event.preventDefault();

            var dataType = this.draggedTypeFor(event.dataTransfer,acceptedOutputTypes)
            var data = event.dataTransfer.getData(dataType);
            if (!data) {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
            }
            console.log("dropForOutput >> " + data)

            let diffModel = new DiffModel(JSON.parse(data))

            diffModel.loadRulePlaceholder(this.rulePlaceholderModel.output)

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[diffModel.visualStateIndex]

                let inputPositionBefore = visualState.currentInputEvent.touches.find(aTouch => aTouch.id == this.rulePlaceholderModel.input.id)
                let inputPositionAfter = visualState.nextState.currentInputEvent.touches.find(aTouch => aTouch.id == this.rulePlaceholderModel.input.id)

                this.calculateFactor(this.rulePlaceholderModel.input.property,this.rulePlaceholderModel.output.property,inputPositionBefore,inputPositionAfter,diffModel.property.before,diffModel.property.after)
            }
        },
        draggedTypeFor(dataTransfer,acceptedTypes) {
            let receivedTypes = [...dataTransfer.types]
            for (let acceptedType of acceptedTypes) {
                for (let receivedType of receivedTypes) {
                    if (acceptedType == receivedType) {
                        return acceptedType
                    }
                }
            }
            return undefined
        },
        dragOverForInput(event) {
            console.log("dragOverForInput >> " + event.dataTransfer.types)

            if (this.draggedTypeFor(event.dataTransfer,acceptedInputTypes)) {
                event.preventDefault()
            }
        },
        dragOverForOutput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForOutput >> " + event.dataTransfer.types)

            if (this.draggedTypeFor(event.dataTransfer,acceptedOutputTypes)) {
                event.preventDefault()
            }
        },
        mouseUpFor(event,ruleSide,ruleSection) {
            // event.preventDefault()
            // event.stopPropagation()
            console.log("rulePlaceholderModel >> mouseUpFor ruleSide: " + ruleSide + " ruleSection: " + ruleSection)
            let linkingObject = globalStore.toolbarState.linkingObject
            if (linkingObject) {
                switch(ruleSide) {
                    case 'mainCondition':
                        //This should only work if the linkingObject can act as an input
                        console.log("Ignoring link in mainCondition")
                        return
                        break;
                    case 'input':
                        //This should only work if the linkingObject can act as an input
                        if (!linkingObject instanceof InputEventTouch) {
                            console.log("Ignoring link in inputRule")
                            return
                        }
                        break;
                    case 'output':
                        //This should only work if the linkingObject can act as an output
                        if (!linkingObject instanceof ShapeModel) {
                            console.log("Ignoring link in outputRule")
                            return
                        }
                        break;
                    default:
                        console.log("Unrecognized rule side: " + ruleSide)
                }

                if (ruleSection == 'min' || ruleSection == 'max') {
                    let aRuleSide = this.rulePlaceholderModel[ruleSide]
                    if (aRuleSide.type && aRuleSide.id && aRuleSide.property && aRuleSide.axiss.length > 0) {
                        //If we have data in the input/output (type,id,property,axiss) later we infer the min/max axis
                        // for (let eachAxis of aRuleSide.axiss) {
                            //TODO binding is not working here
                            aRuleSide[ruleSection] = linkingObject[aRuleSide.property].value
                        // }
                    } else {
                        let newContextMenu = new ContextMenu()
                        newContextMenu.startingX = event.pageX;
                        newContextMenu.startingY = event.pageY;

                        newContextMenu.onSelectedProperty = function(property,axis) {
                            // for (let eachAxis of axis) {
                            //     value[eachAxis] = linkingObject[property].value[eachAxis]
                            // }
                            // this[ruleSectionToFill] = value
                            aRuleSide[ruleSection] = linkingObject[property].value
                            newContextMenu.$el.remove()
                            newContextMenu.$destroy()
                        }.bind(this)

                        newContextMenu.$mount()
                        window.document.body.appendChild(newContextMenu.$el)
                    }
                }
            }
        },
        calculateFactor(inputProperty,outputProperty,inputBefore,inputAfter,outputBefore,outputAfter) {
            // input * factor = output => factor = output/input
            let deltaOutput = {x:1,y:1}
            let deltaInput = {x:1,y:1}
            switch (inputProperty) {
                case 'translation': {
                    deltaInput.x = inputAfter.x - inputBefore.x
                    deltaInput.y = inputAfter.y - inputBefore.y
                    break;
                }
                case 'scaling': {
                    if (inputAfter.radiusX) {
                        deltaInput.x = inputAfter.radiusX - inputBefore.radiusX
                        deltaInput.y = inputAfter.radiusY - inputBefore.radiusY
                    } else {
                        deltaInput.x = inputAfter.w - inputBefore.w
                        deltaInput.y = inputAfter.h - inputBefore.h

                    }
                    break;
                }
            }
            switch (outputProperty) {
                case 'translation': {
                    deltaOutput.x = outputAfter.x - outputBefore.x
                    deltaOutput.y = outputAfter.y - outputBefore.y
                    break;
                }
                case 'scaling': {
                    deltaOutput.x = outputAfter.w - outputBefore.w
                    deltaOutput.y = outputAfter.h - outputBefore.h
                    break;
                }
            }
            this.rulePlaceholderModel.factor.x = deltaOutput.x / deltaInput.x;
            this.rulePlaceholderModel.factor.y = deltaOutput.y / deltaInput.y;
        }
    },
    computed: {
        activeColor: function() {
            return this.isActive ? 'gray' : 'white'
        }
    }
}
</script>
<style scoped>
input {
    font-size:1.1em;
    font-family: futura;
    padding: 2px;
    width: 30%;
}

.rule-placeholder {
     display: flex;
     flex-basis: auto;
     flex-direction: column;
     margin: 10px;
     overflow: visible; /* Or flex might break */
     font-size: 1em;
     padding: 5px !important;
     width: 250px;
     margin-bottom: 5px !important;
     height: 150px;
}
.leftSide {
    /*height: 50px;*/
    position: relative;
    display:flex;
    flex-direction: row;
}
.rightSide {
    /*height: 50px;*/
    position: relative;
    display: flex;
    flex-direction: row;
}
.condition {
    width: 100%;
    /*height: 50px;*/
}
.MinMax {
    position:absolute;
    border-radius: 20px;
    width: 30%;
    height: 25px;
    border: 1px solid #ffffff;
    background-color: #333333;
    color: #ffffff;
    text-align: center;
    font-size: 0.8em;
}
.MinMax:placeholder-shown{
    background-color: rgba(255,255,255,1);
    border: 1px solid #333333;
    color: #ffffff;
    border-radius: 10px;
    width: 15px;
    height: 15px;
    font-size: 0.7em;
}
.MinMax:focus {
    border-radius: 20px;
    min-width: 25%;
    height: 25px;
    border: 1px solid #333333;
    background-color: #333333;
    color: #eeeeee;
    text-align: center;
    font-size: 0.8em;
}
.MinMax.min {
    top:-10px;
    left:0px;
}
.MinMax.max {
    top:20px;
    left:0px;
}
.factor {
    font-size:1.1em;
    font-family: futura;
    text-align: center;
}
</style>