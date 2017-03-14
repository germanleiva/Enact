<template>
    <div class='box rule-placeholder'>
        <input class="condition input" v-on:mouseup="mouseUpFor($event,'mainCondition')" placeholder="Main Condition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput" v-on:mouseup="mouseUpFor($event,'input')" :style="{ backgroundColor: activeColor }">
            <input class="input" v-model="rulePlaceholderModel.input.type" style="width: 25%" placeholder="Type">
            <input class="input" v-model="rulePlaceholderModel.input.id" placeholder="Id">
            <input class="input" v-model="rulePlaceholderModel.input.property" style="width: 25%" placeholder="Property">
            <!-- <input v-model="rulePlaceholderModel.input.axiss" style="width: 25%" placeholder="Input Axis"> -->
            <select v-model="rulePlaceholderModel.input.axiss" style="width: 25%; height:35px" placeholder="Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>
            <input class="inputCondition input" v-model="rulePlaceholderModel.input.min" style="width: 50%" v-on:mouseup="mouseUpFor($event,'input','min')"placeholder="Min input">
            <input class="inputCondition input" v-model="rulePlaceholderModel.input.max" style="width: 50%" v-on:mouseup="mouseUpFor($event,'input','max')" placeholder="Max input">
        </div>
        <div>{{rulePlaceholderModel.factor}}</div>
        <div class="rightSide" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput" v-on:mouseup="mouseUpFor($event,'output')" :style="{ backgroundColor: activeColor }">
            <input v-model="rulePlaceholderModel.output.type" style="width: 25%" placeholder="Output Type">
            <input v-model="rulePlaceholderModel.output.id" style="width: 25%" placeholder="Output Id">
            <input v-model="rulePlaceholderModel.output.property" style="width: 25%" placeholder="Output Property">
<!--             <input v-model="rulePlaceholderModel.output.axiss" style="width: 25%" placeholder="Output Axis">
 -->
            <select v-model="rulePlaceholderModel.output.axiss" style="width: 25%" placeholder="Output Axis" multiple>
              <option>x</option>
              <option>y</option>
            </select>
            <input class="outputCondition" v-model="rulePlaceholderModel.output.min" v-on:mouseup="mouseUpFor($event,'output','min')" placeholder="Min output">
            <input class="outputCondition" v-model="rulePlaceholderModel.output.max" v-on:mouseup="mouseUpFor($event,'output','max')" placeholder="Max output">
        </div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

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
            var data = event.dataTransfer.getData("text/input");

            let dataObject = undefined
            if (data) {
                //It's an touch input
                dataObject = JSON.parse(data)

                this.rulePlaceholderModel.input.type = "touch";
                this.rulePlaceholderModel.input.property = "translation"
            } else {
                data = event.dataTransfer.getData("text/measure");
                if (data) {
                    //It's a measure
                    dataObject = JSON.parse(data)
                    // {type:'point', fromType: 'distance', fromId:'distance0',fromHandler:'center',toType:'distance', toId:'distance0',toHandler:'center',axiss:['y']},
                    this.rulePlaceholderModel.input.type = "measure"
                    this.rulePlaceholderModel.input.property = dataObject.property.name

                }
            }

            this.rulePlaceholderModel.input.id = dataObject.id

            this.rulePlaceholderModel.input.axiss = []
            if (dataObject.property.before.x != dataObject.property.after.x) {
                this.rulePlaceholderModel.input.axiss.push('x')
            }
            if (dataObject.property.before.y != dataObject.property.after.y) {
                this.rulePlaceholderModel.input.axiss.push('y')
            }

            //To account for the ≠ naming of the scaling axis (w & h)
            if (dataObject.property.before.w != dataObject.property.after.w) {
                this.rulePlaceholderModel.output.axiss.push('x')
            }
            if (dataObject.property.before.h != dataObject.property.after.h) {
                this.rulePlaceholderModel.output.axiss.push('y')
            }

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[dataObject.visualStateIndex]
                //the dataObject have the input diff values

                this.rulePlaceholderModel.output.property //We assume this is 'translation'
                let outputPositionBefore = visualState.shapesDictionary[this.rulePlaceholderModel.output.id].position
                let outputPositionAfter = visualState.nextState.shapesDictionary[this.rulePlaceholderModel.output.id].position

                this.calculateFactor(dataObject.property.before,dataObject.property.after,outputPositionBefore,outputPositionAfter)
            }

        },
        dropForOutput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/output");

            //data = {"id":"shape0","type":"output","property":{"name":"translation","before":{"x":141,"y":126},"after":{"x":141,"y":195}}}

            // let outputRuleObject = {}
            // outputRuleObject.id = data.id
            // outputRuleObject.property = "translation"
            // outputRuleObject.
            console.log("dropForOutput >> " + data)
            let dataObject = JSON.parse(data)
            this.rulePlaceholderModel.output.type = "shape"
            this.rulePlaceholderModel.output.id = dataObject.id
            this.rulePlaceholderModel.output.property = dataObject.property.name

            this.rulePlaceholderModel.output.axiss = []
            if (dataObject.property.before.x != dataObject.property.after.x) {
                this.rulePlaceholderModel.output.axiss.push('x')
            }
            if (dataObject.property.before.y != dataObject.property.after.y) {
                this.rulePlaceholderModel.output.axiss.push('y')
            }

            //To account for the ≠ naming of the scaling axis (w & h)
            if (dataObject.property.before.w != dataObject.property.after.w) {
                this.rulePlaceholderModel.output.axiss.push('x')
            }
            if (dataObject.property.before.h != dataObject.property.after.h) {
                this.rulePlaceholderModel.output.axiss.push('y')
            }

            if (this.rulePlaceholderModel.input.id != undefined && this.rulePlaceholderModel.output.id != undefined) {
                let visualState = globalStore.visualStates[dataObject.visualStateIndex]
                //the dataObject have the input diff values

                this.rulePlaceholderModel.input.property //We assume this is 'translation'
                let inputPositionBefore = visualState.currentInputEvent.touches[this.rulePlaceholderModel.input.id]
                let inputPositionAfter = visualState.nextState.currentInputEvent.touches[this.rulePlaceholderModel.input.id]

                this.calculateFactor(inputPositionBefore,inputPositionAfter,dataObject.property.before,dataObject.property.after)
            }
        },
        dragOverForInput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForInput >> " + dataType)
            if (dataType == "text/input") {
                event.preventDefault()
            }
            if (dataType == "text/measure") {
                event.preventDefault()
            }
        },
        dragOverForOutput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForOutput >> " + dataType)

            if (dataType == "text/output") {
                event.preventDefault()
            }
        },
        mouseUpFor(event,ruleSide,ruleSection) {
            // event.preventDefault()
            // event.stopPropagation()
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
                        console.log("Ignoring link in inputRule")
                        return
                        break;
                    case 'output':
                        //This should only work if the linkingObject can act as an output
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
        calculateFactor(inputPositionBefore,inputPositionAfter,outputPositionBefore,outputPositionAfter) {
            // input * factor = output => factor = output/input

            this.rulePlaceholderModel.factor.x = (outputPositionAfter.x - outputPositionBefore.x) / (inputPositionAfter.x - inputPositionBefore.x)
            this.rulePlaceholderModel.factor.y = (outputPositionAfter.y - outputPositionBefore.y) / (inputPositionAfter.y - inputPositionBefore.y)
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
    width: 25%;
    padding: 2px;
    border-radius: 0px !important;
}

.rule-placeholder {
    display: flex;
    margin: 10px;
    overflow: hidden; /* Or flex might break */
    flex-wrap: wrap;
    font-size: 1em;
    padding: 5px !important;
}
.leftSide {
    width: 50%;
    /*height: 50px;*/
    display:flex;
    flex-wrap: wrap;
}
.rightSide {
    width: 50%;
    /*height: 50px;*/
    display: flex;
    flex-wrap: wrap;
}
.condition {
    width: 100%;
    /*height: 50px;*/
}
.outputCondition {
    width: 50%;
    /*height: 50px;*/
}
.inputCondition {
    width: 50%;
    /*height: 50px;*/
}
</style>