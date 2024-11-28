const { ApplicationV2 } = foundry.applications.api;

import VueRenderingMixin from "../item/_vue-application-mixin.mjs";
import { ArchmageMookDamageAppV2 } from "../../vue/components.vue.es.js";

export class MookDamageApplicationV2 extends VueRenderingMixin(ApplicationV2) {
  targetDocuments = [];
  sceneDocuments = [];
  damage = 0;

  vueParts = {
    'archmage-mook-damage-app-v2': {
      component: ArchmageMookDamageAppV2,
      template: `<archmage-mook-damage-app-v2 :context="context">Vue rendering for application failed.</archmage-mook-damage-app-v2>`,
    }
  }

  constructor(documents, damage, options = {}) {
    super(options);
    this.targetDocuments = documents;
    this.damage = damage;
    this.isEditable = true;

    const targetIds = documents.map(t => t.id);
    const sceneTokens = [...game.scenes.viewed.tokens.values() ?? []].filter(t => {
      return t.actor.type === 'npc'
        && !targetIds.includes(t.id)
        && t.actor.system.details.role.value === 'mook';
    });

    this.sceneDocuments = sceneTokens;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["mook-damage-application", "dialog-form", "standard-form"],
    actions: {
      ok: this._onSubmit,
    },
    position: {
      width: 640,
      // height: 400,
    },
    window: {
      title: 'Apply Damage to Mooks',
      resizable: true,
      controls: []
    },
    tag: 'form',
    form: {
      handler: this._onSubmitMookForm,
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: true,
    },
  };

  async _prepareContext(options) {
    const context = {
      damage: {},
      mooks: {
        targets: this.targetDocuments ?? [],
        other: this.sceneDocuments ?? [],
      }
    };

    context.damage.single = this.damage;
    context.damage.total = context.damage.single * context.mooks.targets.length;
    context.damage.overTargets = 0;
    context.damage.overOther = 0;

    for (let token of context.mooks.targets) {
      if (context.damage.single > token.actor.system.attributes.hp.value) {
        context.damage.overTargets += context.damage.single - token.actor.system.attributes.hp.value;
      }
    }

    return context;
  }

  /**
   * Handle submitting the dialog.
   * @param {HTMLButtonElement} target        The button that was clicked or the default button.
   * @param {PointerEvent|SubmitEvent} event  The triggering event.
   * @returns {Promise<DialogV2>}
   * @protected
   */
  static async _onSubmit(target, event) {
    // event.preventDefault();
    const form = this.element;
    const formElements = form.querySelectorAll('.mook-row [data-token-id]');

    if (formElements) {
      // const updateData = {};
      for (let element of formElements) {
        const damage = Number(element.dataset.value);
        if (damage > 0) {
          // updateData[element.name] = element.dataset.value;
          let token = element.dataset.group === 'targets'
            ? this.targetDocuments.find(t => t.id === element.dataset.tokenId)
            : this.sceneDocuments.find(t => t.id === element.dataset.tokenId);
          if (token) {
            token.actor.update({
              'system.attributes.hp.value': token.actor.system.attributes.hp.value - damage,
            });
          }
        }
      }
    }
    return this.options.form.closeOnSubmit ? this.close() : this;
  }
}
