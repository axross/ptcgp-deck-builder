import { describe, expect, it } from "vitest";
import { normalizeDotggCard, parseLimitlessFlavor } from "./fetch-set-data.mjs";
import { transformSourceCard, validateCards } from "./set-ingestion.mjs";

// Raw dotgg.gg (`game=pokepocket`) records, trimmed to the fields the adapter
// reads — the real wire shapes captured while confirming the endpoint. The
// adapter's job is to turn these into the pipeline's `sourceCardSchema` contract.
const bulbasaurRaw = {
  id: "A1-001",
  setId: "A1",
  number: "1",
  name: "Bulbasaur",
  rarity: "Common",
  color: "Grass",
  type: "Pokemon",
  slug: "a1-1-bulbasaur",
  hp: "70",
  stage: "Basic",
  prew_stage_name: null,
  attack: [{ info: "{GC} Vine Whip 40", effect: "" }],
  ability: null,
  text: null,
  weakness: "Fire",
  retreat: "1",
  rule: null,
  illustrator: "Narumi Sato",
  props: [
    { name: "Dupe Reward", value: "10" },
    { name: "Pack Point", value: "35" },
  ],
};

const geneticApex = { name: "Genetic Apex", nameJa: "最強の遺伝子" };

describe("normalizeDotggCard()", () => {
  it("maps a Pokémon record into the source contract", () => {
    expect(normalizeDotggCard(bulbasaurRaw, "A1")).toEqual({
      slug: "a1-1-bulbasaur",
      setCode: "A1",
      number: 1,
      name: "Bulbasaur",
      rarity: { symbol: "◇", code: "C", label: "Common" },
      category: "Pokemon",
      illustrator: "Narumi Sato",
      boosterPacks: null,
      flavorText: null,
      shop: { packPoints: 35, dupeShinedust: 10 },
      pokemon: {
        type: "Grass",
        hp: 70,
        stage: "Basic",
        evolvesFrom: null,
        ruleBox: "None",
        isBaby: false,
        classification: null,
        weakness: "Fire",
        retreatCost: 1,
        abilities: [],
        attacks: [
          {
            name: "Vine Whip",
            cost: ["Grass", "Colorless"],
            damage: 40,
            damageSuffix: null,
            text: null,
          },
        ],
      },
      trainer: null,
    });
  });

  it("parses a multi-energy cost, a '×' suffix, and effect text from an attack", () => {
    const circleCircuit = {
      ...bulbasaurRaw,
      color: "Lightning",
      weakness: "Fighting",
      attack: [
        {
          info: "{LL} Circle Circuit 30x",
          effect: "This attack does 30 damage for each of your Benched {L} Pokémon.",
        },
      ],
    };

    expect(normalizeDotggCard(circleCircuit, "A1").pokemon.attacks[0]).toEqual({
      name: "Circle Circuit",
      cost: ["Lightning", "Lightning"],
      damage: 30,
      damageSuffix: "×",
      text: "This attack does 30 damage for each of your Benched {L} Pokémon.",
    });
  });

  it("reads a '+' suffix and leaves effect-only attacks without damage", () => {
    const raw = {
      ...bulbasaurRaw,
      attack: [
        { info: "{WWC} Hydro Bazooka 100+", effect: "" },
        { info: "{R} Inferno Dance", effect: "Flip 3 coins." },
      ],
    };
    const attacks = normalizeDotggCard(raw, "A1").pokemon.attacks;

    expect(attacks[0]).toMatchObject({ name: "Hydro Bazooka", damage: 100, damageSuffix: "+" });
    expect(attacks[1]).toMatchObject({ name: "Inferno Dance", damage: null, damageSuffix: null });
  });

  it("derives the ex rule box from the card name and reads a thousands-separated shop cost", () => {
    const venusaurEx = {
      ...bulbasaurRaw,
      name: "Venusaur ex",
      slug: "a1-4-venusaur-ex",
      rarity: "Double Rare",
      stage: "Stage 2",
      prew_stage_name: "Ivysaur",
      rule: "When your Pokémon ex is Knocked Out, your opponent gets 2 points.",
      props: [
        { name: "Dupe Reward", value: "870" },
        { name: "Pack Point", value: "1,250" },
      ],
    };
    const card = normalizeDotggCard(venusaurEx, "A1");

    expect(card.pokemon.ruleBox).toBe("ex");
    expect(card.pokemon.stage).toBe("Stage2");
    expect(card.pokemon.evolvesFrom).toBe("Ivysaur");
    expect(card.shop).toEqual({ packPoints: 1250, dupeShinedust: 870 });
  });

  it("derives the MegaEx rule box from a 'Mega …' name and keeps its evolves-from stage", () => {
    // B1 (Mega Rising) debuts the MegaEx rule box; a Mega evolves from its real
    // prior stage (Combusken → Mega Blaziken ex), skipping the plain Stage 2.
    const megaBlaziken = {
      ...bulbasaurRaw,
      name: "Mega Blaziken ex",
      slug: "b11-36-mega-blaziken-ex",
      color: "Fire",
      rarity: "Double Rare",
      stage: "Stage 2",
      prew_stage_name: "Combusken",
      rule: "When your Pokémon ex is Knocked Out, your opponent gets 3 points.",
    };
    const card = normalizeDotggCard(megaBlaziken, "B1");

    expect(card.pokemon.ruleBox).toBe("MegaEx");
    expect(card.pokemon.stage).toBe("Stage2");
    expect(card.pokemon.evolvesFrom).toBe("Combusken");
  });

  it("treats a Dragon's 'none'/'UNSPECIFIED' weakness as 'none'", () => {
    const dragon = { ...bulbasaurRaw, color: "Dragon", weakness: "UNSPECIFIED" };

    expect(normalizeDotggCard(dragon, "A1").pokemon.weakness).toBe("none");
  });

  it("maps a Supporter Trainer, stripping reminder-text markup", () => {
    const sabrina = {
      id: "A1-225",
      setId: "A1",
      number: "225",
      name: "Sabrina",
      rarity: "Uncommon",
      color: null,
      type: "Trainer",
      slug: "a1-225-sabrina",
      stage: "Supporter",
      text: 'Switch out your opponent\'s Active Pokémon to the Bench. <span class="reminder-text">(Your opponent chooses the new Active Pokémon.)</span>',
      illustrator: "Yuu Nishida",
      props: [{ name: "Pack Point", value: "70" }],
    };
    const card = normalizeDotggCard(sabrina, "A1");

    expect(card.category).toBe("Trainer");
    expect(card.pokemon).toBeNull();
    expect(card.trainer).toEqual({
      subtype: "Supporter",
      text: "Switch out your opponent's Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.)",
    });
  });

  it("models a fossil as an Item and turns <br> into newlines", () => {
    const helix = {
      id: "A1-216",
      setId: "A1",
      number: "216",
      name: "Helix Fossil",
      rarity: "Common",
      type: "Trainer",
      slug: "a1-216-helix-fossil",
      stage: "Item",
      text: "Play this card as if it were a 40-HP Basic {C} Pokémon.<br>At any time during your turn, you may discard this card from play.<br>This card can't retreat.",
      illustrator: "Toyste Beach",
      props: [{ name: "Pack Point", value: "35" }],
    };
    const card = normalizeDotggCard(helix, "A1");

    expect(card.trainer.subtype).toBe("Item");
    expect(card.trainer.text).toBe(
      "Play this card as if it were a 40-HP Basic {C} Pokémon.\nAt any time during your turn, you may discard this card from play.\nThis card can't retreat.",
    );
  });

  it("maps a Pokémon Tool (subtype in `type`, null `stage`) to PokemonTool", () => {
    const tool = {
      id: "A2-147",
      setId: "A2",
      number: "147",
      name: "Rocky Helmet",
      rarity: "Uncommon",
      type: "Pokémon Tool",
      slug: "a2-147-rocky-helmet",
      stage: null,
      text: "If the Pokémon this card is attached to is Active and is damaged by an attack, do 20 damage to the Attacking Pokémon.",
      illustrator: "Studio Bora Inc.",
      props: [{ name: "Pack Point", value: "35" }],
    };

    expect(normalizeDotggCard(tool, "A2").trainer.subtype).toBe("PokemonTool");
  });

  it("maps the B1 Shiny tiers to their { symbol, code, label } tuples", () => {
    const shiny = { ...bulbasaurRaw, rarity: "Shiny" };
    const shinySuper = { ...bulbasaurRaw, rarity: "Shiny Super Rare" };

    expect(normalizeDotggCard(shiny, "B1").rarity).toEqual({
      symbol: "✸",
      code: "S",
      label: "Shiny",
    });
    expect(normalizeDotggCard(shinySuper, "B1").rarity).toEqual({
      symbol: "✸✸",
      code: "SSR",
      label: "Shiny Super Rare",
    });
  });

  it("passes an unknown rarity through as its own code so the schema rejects it", () => {
    const mystery = { ...bulbasaurRaw, rarity: "Ultra Secret Rare" };

    expect(normalizeDotggCard(mystery, "A1").rarity).toEqual({
      symbol: "Ultra Secret Rare",
      code: "Ultra Secret Rare",
      label: "Ultra Secret Rare",
    });
  });

  it("produces records that pass the full transform and schema validation", () => {
    const cards = [bulbasaurRaw].map((raw) =>
      transformSourceCard(normalizeDotggCard(raw, "A1"), geneticApex, 286),
    );

    expect(validateCards(cards)).toEqual({ ok: true, errors: [] });
  });
});

describe("parseLimitlessFlavor()", () => {
  it("extracts the flavor sentence from a Limitless card page", () => {
    const html = `
      <div class="card-text-section card-text-artist">Illustrated by X</div>
      <div class="card-text-section card-text-flavor">
        There is a plant seed on its back right from the day this Pokémon is born.
      </div>`;

    expect(parseLimitlessFlavor(html)).toBe(
      "There is a plant seed on its back right from the day this Pokémon is born.",
    );
  });

  it("returns null when a card page has no flavor block", () => {
    expect(parseLimitlessFlavor('<div class="card-text-section">no flavor here</div>')).toBeNull();
  });
});
