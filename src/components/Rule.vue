<template>
    <div class='rule'>
        <input class="condition" v-model="mainCondition">
        <div class="leftSide" v-on:drop="dropForInput" v-on:dragover="dragOverForInput">
            <input v-model="inputRule" style="width: 100%" v-on:mouseup="mouseUpFor($event,'inputRule')">
        </div>
        <div class="rightSide" >
            <input v-model="outputRule" style="width: 100%" v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput" v-on:mouseup="mouseUpFor($event,'outputRule')">
            <input class="outputCondition" v-model="outputMinimum" v-on:mouseup="mouseUpFor($event,'outputMinimum')" placeholder="Min output">
            <input class="outputCondition" v-model="outputMaximum" v-on:mouseup="mouseUpFor($event,'outputMaximum')" placeholder="Max output">
        </div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
import Rule from './Rule.vue'

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
    name: 'rule-area',
    data: function() {
        return {
            mainCondition: "",
            inputRule: "",
            outputRule: "",
            outputMinimum: "",
            outputMaximum: "",
        }
    },
    components: {
        'rule':Rule
    },
    methods: {
        dropForInput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/input");
            if (data) {
                //It's an input
            } else {
                data = event.dataTransfer.getData("text/measure");
                if (data) {
                    //It's a measure
                }
            }
            this.inputRule = data
        },
        dropForOutput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/output");

            //{"id":"shape0","type":"output","translation":{"previousValue":{"x":72,"y":89},"newValue":{"x":129,"y":192}}}

            // let outputRuleObject = {}
            // outputRuleObject.id = data.id
            // outputRuleObject.property = "translation"
            // outputRuleObject.

            this.outputRule = data

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
        mouseUpFor(event,ruleSection) {
            let linkingObject = globalStore.toolbarState.linkingObject
            if (linkingObject) {
                let ruleSectionToCheck = "outputRule"
                let ruleSectionToFill = "outputMaximum"

                let value = {}
                if (this[ruleSectionToCheck]) {
                    for (let eachAxis of this[ruleSectionToCheck].axis) {
                        value[eachAxis] = linkingObject[outputRule.property].value[eachAxis]
                    }
                    this[ruleSectionToFill] = value
                } else {
                    let newContextMenu = new ContextMenu()
                    newContextMenu.startingX = event.pageX;
                    newContextMenu.startingY = event.pageY;

                    newContextMenu.onSelectedProperty = function(property,axis) {
                        for (let eachAxis of axis) {
                            value[eachAxis] = linkingObject[property].value[eachAxis]
                        }
                        this[ruleSectionToFill] = value

                        newContextMenu.$el.remove()
                        newContextMenu.$destroy()
                    }.bind(this)

                    newContextMenu.$mount()
                    window.document.body.appendChild(newContextMenu.$el)
                }
            }
        },
    },
    computed: {
        rulesModel: function() {
            return globalStore.rules
        }
    }
}
</script>
<style scoped>
input {
    font-size:24px;
}

.rule {
    display: flex;
    margin: 10px;
    overflow: hidden; /* Or flex might break */
    flex-wrap: wrap;
    font-size: 2em;
}
.leftSide {
    width: 50%;
    /*height: 50px;*/
    background-color: green
}
.rightSide {
    width: 50%;
    /*height: 50px;*/
    background-color: red;
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
</style>