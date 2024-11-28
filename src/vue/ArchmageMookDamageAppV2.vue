<template>
  <!-- <div class="form-header">How do you want to apply the damage?</div> -->
  <div class="dialog-content standard-form" :key="context._renderKey">
    <div class="flexrow mooks-total">
      <span class="total-label">Total Damage</span>
      <strong class="total-damage">{{ context.damage.total }}</strong>
    </div>
    <fieldset>
      <legend>Targets</legend>
      <div class="flexrow mook-row mook-header">
        <span class="mook-img"></span>
        <span class="mook-name">Name</span>
        <span class="mook-hp">Current HP</span>
        <span class="mook-damage">Damage</span>
        <span class="mook-spill">Spillover</span>
      </div>
      <ul class="mooks-list mooks-targets">
        <li v-for="(token, index) in context.mooks.targets" :key="token._id">
          <MookDamageRow :token="token" group="targets" :editable="false" :max="context.damage.overTargets" :damage="damage"/>
        </li>
      </ul>
      <div class="flexrow mook-row mook-footer">
        <span class="mook-name"></span>
        <strong class="mook-spill">{{ context.damage.overTargets }}</strong>
      </div>
    </fieldset>

    <fieldset>
      <legend>Other Mooks</legend>
      <div class="flexrow mook-row mook-header">
        <span class="mook-img"></span>
        <span class="mook-name">Name</span>
        <span class="mook-hp">Current HP</span>
        <span class="mook-damage">Damage</span>
        <span class="mook-spill">Spillover</span>
      </div>
      <ul class="mooks-list mooks-other">
        <li v-for="(token, index) in context.mooks.other" :key="token._id">
          <MookDamageRow :token="token" group='other' :editable="true" :max="context.damage.overTargets" :damage="damage"/>
        </li>
      </ul>
      <div class="flexrow mook-row mook-footer">
        <span class="mook-name"></span>
        <strong :class="`mook-spill ${overOther > 0 ? 'low' : ''} ${overOther < 0 ? 'high' : ''}`">{{ overOther }}</strong>
      </div>
    </fieldset>
  </div>
  <div class="form-footer">
    <button type="submit" data-action="ok"><i class="fas fa-check"></i> Apply Damage</button>
  </div>
</template>

<script>
import MookDamageRow from '@/components/dialogs/mook-damage/MookDamageRow.vue';
export default {
  name: 'ArchmageMookDamageAppV2',
  props: ['context'],
  components: {
    MookDamageRow,
  },
  setup() {
    return {
      CONFIG,
      game,
      foundry,
    }
  },
  data() {
    return {
      damage: {},
      tabs: {
        primary: {},
      },
    }
  },
  methods: {},
  computed: {
    overOther() {
      let spillover = this.context.damage.overTargets || 0;
      for (let damageInstance of Object.values(this.damage).filter(d => d.group === 'other')) {
        console.log('instance', damageInstance);
        if (damageInstance.spillover > 0) spillover += damageInstance.spillover;
        if (damageInstance.actual > 0) spillover -= damageInstance.actual;
      }
      return spillover;
    }
  },
  watch: {},
  async created() {
    for (let [groupName, group] of Object.entries(this.context.mooks)) {
      for (let token of group) {
        this.damage[token._id] = {
          group: groupName,
          damage: groupName === 'targets' ? this.context.damage.single : 0,
          actual: groupName === 'targets' ? this.context.damage.single : 0,
          spillover: 0,
        };
      }
    }
  },
  async mounted() {},
}
</script>