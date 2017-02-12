import Vue from 'vue'
import App from './App.vue'

require('bulma/css/bulma.css')
require('font-awesome/css/font-awesome.css')
// require('./desktop.css')

new Vue({
  el: '#app',
  render: h => h(App)
})