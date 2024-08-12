<template>
  <h3>{{localize('ARCHMAGE.AUTOLEVEL.title')}}</h3>
  <section class="section section--level-edit flexrow">
    <div class="unit unit--modify-level">
      <label><strong>{{localize('ARCHMAGE.AUTOLEVEL.newLevel')}}: {{newLevel}}</strong></label>
      <input type="range" step="1" :min="levelRestraints.min" :max="levelRestraints.max" v-model="newLevel" />
    </div>
    <div class="unit unit--confirm">
      <button class="button button--confirm" @click="autoLevelConfirm" :disabled="noLevelChange" type="button">{{localize('ARCHMAGE.AUTOLEVEL.confirm')}}</button>
    </div>
  </section>
  <section class="section section--level-preview grid grid-3col">
    <ul class="preview-rows flexcol">
      <li>
        <strong>{{localize('ARCHMAGE.CHAT.HP')}}: </strong><span>{{preview.system.attributes.hp.value}} / {{preview.system.attributes.hp.max}} ({{numberFormat(preview.system.attributes.hp.max - actor.system.attributes.hp.max, 0, true)}})</span>
      </li>
      <li>
        <strong>{{localize('ARCHMAGE.ac.key')}}: </strong><span>{{preview.system.attributes.ac.value}} ({{numberFormat(preview.system.attributes.ac.value - actor.system.attributes.ac.value, 0, true)}})</span>
      </li>
      <li>
        <strong>{{localize('ARCHMAGE.pd.key')}}: </strong><span>{{preview.system.attributes.pd.value}} ({{numberFormat(preview.system.attributes.pd.value - actor.system.attributes.pd.value, 0, true)}})</span>
      </li>
      <li>
        <strong>{{localize('ARCHMAGE.md.key')}}: </strong><span>{{preview.system.attributes.md.value}} ({{numberFormat(preview.system.attributes.md.value - actor.system.attributes.md.value, 0, true)}})</span>
      </li>
    </ul>
    <div class="help-text">
      <p>{{localize('ARCHMAGE.AUTOLEVEL.help')}}</p>
    </div>
  </section>
</template>

<script>
  import Input from '@/components/parts/Input.vue'
  import { ref } from 'vue';
  import { localize, getActor, numberFormat } from '@/methods/Helpers';
  export default {
    name: 'NpcModifyLevel',
    props: ['actor'],
    components: {
      Input
    },
    setup(props) {
      const newLevel = ref(props.actor.system.attributes.level.value);
      return {
        newLevel,
        localize,
        numberFormat
      }
    },
    computed: {
      preview() {
        // Set the level.
        let lvl = Number(this.actor.system.attributes.level.value || 0);
        let newLvl = this.newLevel;
        let delta = newLvl - lvl;

        // Generate the prefix.
        let suffix = ` (+${delta})`;
        if (delta < 0) suffix = ` (${delta})`;

        if (newLvl < 0 || newLvl > 15) {
          ui.notifications.warn(game.i18n.localize("ARCHMAGE.UI.levelLimits"));
          return;
        }

        // Set other overrides.
        let mul = CONFIG.ARCHMAGE.npcLevelupMultipliers[delta.toString()];
        if (!mul) mul = Math.pow(1.25, delta);
        let overrideData = {
          'name': this.actor.name+suffix,
          'system.attributes.level.value': newLvl,
          'system.attributes.ac.value': Number(this.actor.system.attributes.ac.value || 0) + delta,
          'system.attributes.pd.value': Number(this.actor.system.attributes.pd.value || 0) + delta,
          'system.attributes.md.value': Number(this.actor.system.attributes.md.value || 0) + delta,
          'system.attributes.init.value': Number(this.actor.system.attributes.init.value || 0) + delta,
          'system.attributes.hp.value': Math.round(this.actor.system.attributes.hp.value * mul),
          'system.attributes.hp.max': Math.round(this.actor.system.attributes.hp.max * mul),
        };

        // Create a preview actor that we can use for display.
        let previewActor = {
          name: this.actor.name,
          system: foundry.utils.duplicate(this.actor.system)
        };

        // Update the fields.
        for (let [key, value] of Object.entries(overrideData)) {
          foundry.utils.setProperty(previewActor, key, value);
        }

        return previewActor;
      },
      levelRestraints() {
        return {
          min: Math.max(0, this.actor.system.attributes.level.value - 6),
          max: Math.min(15, this.actor.system.attributes.level.value + 6)
        }
      },
      noLevelChange() {
        return this.actor.system.attributes.level.value == this.newLevel;
      }
    },
    methods: {
      autoLevelConfirm(event) {
        getActor(this.actor).then(actor => {
          if (!actor) return;
          // Prepare the delta and run the method.
          let delta = this.newLevel - this.actor.system.attributes.level.value;
          if (delta !== 0) {
            actor.autoLevelActor(delta).then(newActor => {
              newActor.setFlag('archmage', 'sheetDisplay.tabs.primary.value', 'actions').then(() => {
                newActor.sheet.render(true);
              });
            });
          }
        });
      }
    }
  }
</script>

<style lang="scss">
.archmage-v2.npc-sheet {
  .section--level-edit {
    margin: $padding-lg;
    align-items: center;
  }

  .unit--modify-level {
    display: flex;
    align-items: center;
    margin-right: $padding-md;
    flex: 1;

    label,
    input {
      display: inline-block;
      width: auto;
    }

    label {
      margin-right: $padding-md;
      flex: 0 auto;
      width: 100px;
    }

    input {
      width: auto;

      &:hover,
      &:focus {
        border: none;
      }
    }
  }

  .section--level-preview {
    padding: $padding-md;
    margin: $padding-md 0;
    border: 1px solid $c-black--25;
    border-radius: 8px;

    .help-text {
      grid-column: span 2;
    }
  }

  .preview-rows {
    list-style-type: none;
    padding: 0;

    li + li {
      border-top: 1px solid $c-black--25;
    }
  }

  .button {
    font-family: $font-stack-secondary;
    font-size: 18px;
    line-height: 2;
    transition: all ease-in-out 0.25s;

    &[disabled] {
      opacity: 0.25;
    }
  }
}

</style>
