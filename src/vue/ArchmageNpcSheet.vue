<template>
  <div :class="concat('archmage-v2-vue flexcol ', nightmode)" @click="toggleEditWrappers">

    <!-- Top group -->
    <section class="container container--top flexcol">
      <!-- Header -->
      <NpcHeader :actor="actor" :flags="flags" :closeInputs="closeInputs"/>
      <!-- Attributes section -->
      <NpcAttributes :actor="actor"/>
      <!-- Tabs -->
      <Tabs :actor="actor" group="primary" :tabs="tabs.primary" :flags="flags"/>
      <!-- <CharAttributes :actor="actor"/> -->
    </section>
    <!-- /Top group -->

    <!-- Bottom group -->
    <section class="container container--bottom flexcol">

      <!-- Main content -->
      <section class="section section--main flexcol">

        <!-- Class resources -->
        <!-- <CharResources :actor="actor"/> -->

        <!-- Tabs content -->
        <section class="section section--tabs-content flexcol">
          <!-- Details tab -->
          <Tab group="primary" :tab="tabs.primary.details" classes="flexcol">
            <CharDetails :actor="actor" :owner="owner" :flags="flags"/>
          </Tab>
          <!-- Actions tab -->
          <Tab group="primary" :tab="tabs.primary.actions">
            <NpcActions :actor="actor" :flags="flags"/>
          </Tab>
          <!-- Effects tab -->
          <Tab group="primary" :tab="tabs.primary.effects">
            <CharEffects :actor="actor" :flags="flags"/>
          </Tab>
          <!-- Modify Level tab -->
          <Tab group="primary" :tab="tabs.primary.modifyLevel">
            <NpcModifyLevel :actor="actor" />
            <NpcConvertToMob :actor="actor" :context="this.context" v-if="isMook" />
          </Tab>
          <!-- Settings tab -->
          <Tab group="primary" :tab="tabs.primary.settings">
            <NpcSettings :actor="actor"/>
          </Tab>
        </section>
        <!-- /Tabs content -->

      </section>
      <!-- /Main content -->

      <!-- Bottom content -->
      <!-- <section class="section section--bottom flexcol"> -->
        <!-- Attributes section -->
        <!-- <NpcAttributes :actor="actor"/> -->
        <!-- <CharInitiative :actor="actor"/> -->
        <!-- <CharAbilities :actor="actor"/> -->
        <!-- <CharBackgrounds :actor="actor"/> -->
        <!-- <CharIconRelationships :actor="actor"/> -->
        <!-- <CharOut :actor="actor" :owner="owner"/> -->
        <!-- <CharIncrementals :actor="actor"/> -->
      <!-- </section> -->
      <!-- /Bottom content -->

    </section>
    <!-- /Bottom group -->

  </div>
</template>


<script>

import { concat, localize } from '@/methods/Helpers';
import CharDetails from '@/components/actor/character/main/CharDetails.vue';
import CharEffects from '@/components/actor/character/main/CharEffects.vue';
import NpcHeader from '@/components/actor/npc/NpcHeader.vue';
import NpcActions from '@/components/actor/npc/NpcActions.vue';
import NpcAttributes from '@/components/actor/npc/NpcAttributes.vue';
import NpcSettings from '@/components/actor/npc/NpcSettings.vue';
import NpcModifyLevel from '@/components/actor/npc/NpcModifyLevel.vue';
import NpcConvertToMob from './components/actor/npc/NpcConvertToMob.vue';
import Tabs from '@/components/parts/Tabs.vue';
import Tab from '@/components/parts/Tab.vue';

export default {
  name: 'ArchmageNpcSheet',
  props: ['context', 'actor', 'owner'],
  components: {
    NpcHeader,
    Tabs,
    Tab,
    NpcActions,
    NpcAttributes,
    NpcSettings,
    NpcModifyLevel,
    NpcConvertToMob,
    CharDetails,
    CharEffects,
  },
  setup() {
    return {
      concat
    }
  },
  data() {
    return {
      closeInputs: false,
      actorData: {},
      tabs: {
        primary: {
          details: {
            key: 'details',
            label: localize('ARCHMAGE.details'),
            active: false
          },
          actions: {
            key: 'actions',
            label: localize('ARCHMAGE.actions'),
            active: true
          },
          effects: {
            key: 'effects',
            label: localize('ARCHMAGE.effects'),
            active: false
          },
          modifyLevel: {
            key: 'modifyLevel',
            label: localize('ARCHMAGE.modifyLevel'),
            active: false,
          },
          settings: {
            key: 'settings',
            label: localize('ARCHMAGE.settings'),
            active: false,
            icon: 'fa-cogs',
            hideLabel: true
          }
        }
      }
    }
  },
  methods: {
    toggleEditWrappers(event) {
      const $el = $(event.target);
      // Exit early for edit wrappers.
      if ($el.hasClass('edit-wrapper')) {
        return;
      }
      else {
        // Exit early if there's an edit wrapper parent.
        if ($el.parents('.edit-wrapper').length > 0) {
          return;
        }
        // Otherwise, we clicked outside of a toggle input. Close it in that scenario.
        else {
          this.closeInputs = true;
          setTimeout(() => {
            this.closeInputs = false;
          }, 100);
        }
      }
    }
  },
  computed: {
    nightmode() {
      return game.settings.get("archmage", "nightmode") ? 'nightmode' : '';
    },
    flags() {
      let flags = this.actor.flags ? this.actor.flags.archmage : {};
      let baseFlags = {
        'sheetDisplay': {
          'actions': {
            'groupBy': {'value': 'powerType'},
            'sortBy': {'value': 'custom'}
          },
          'header': {
            'collapsed': false
          },
          'tabs': {
            'primary': {'value': 'actions'}
          },
        }
      }
      return foundry.utils.mergeObject(baseFlags, flags);
    },
    isMook() {
      return this.actor.system.details?.role?.value?.toLowerCase?.() === 'mook'
    }
  },
  watch: {},
  async created() {
    console.log("Creating Sheet");
  },
  async mounted() {
    console.log("Sheet Mounted");
  },
};
</script>

<style lang="scss">
.archmage-v2.npc-sheet {
  .section--bottom {
    flex: 0 auto;
  }

  .section--tabs {
    nav.tabs {
      margin-top: 0;
    }
  }
}
</style>
