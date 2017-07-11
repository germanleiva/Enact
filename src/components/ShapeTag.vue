<template>
      <a class="shape-tag"
      v-on:mouseover="mouseOver"
      v-on:mouseout="mouseOut">
      <span>{{shapeName}}</span></a>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'


export default {
    name: 'shape-tag',
    props: ['diffData','visualStateModel'],
    template: ``,
    data: function() {
        return {
          shapeName: this.diffData.name + "." + this.diffData.property.name
        }
    },
    computed: {
    },
    methods: {
        mouseOver(e) {
            console.log("mouseOver for ", this.shapeName)
            this.visualStateModel.toggleHighlightForInvolvedElement(this.diffData,true)
        },
        mouseOut(e) {
            console.log("mouseOut for ", this.shapeName)
            this.visualStateModel.toggleHighlightForInvolvedElement(this.diffData,false)

        }
    }
}

</script>

<style>
.shapeTag {
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  color: #fff;
  background-color: #00d1b2;
  font-weight: normal;
  font-size: 1.1em;
  padding: 0 0.5ch;
  vertical-align: middle;
}
</style>
