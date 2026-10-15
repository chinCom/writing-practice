#!/usr/bin/env python3
"""Offline curriculum authoring & Zod-schema validator for Writing Coach.

Generates:
1. curriculum/course.draft.json  (21-unit, 63-lesson Zero-to-Hero Core Path: PRE_A1 -> C2)
2. curriculum/ielts.draft.json   (8-unit, 24-lesson IELTS Writing Workspace: Task 1 & Task 2)

Preserves all legacy unit, lesson, and task IDs required by Vitest and Playwright E2E suites
while upgrading every unit and lesson with handcrafted mini-lessons, calibrated model texts,
multi-type warmups (choose, gap-fill, reorder, fix-the-error), and progressive scaffolding.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

COURSE_RANGES: dict[str, tuple[int, int]] = {
    "PRE_A1": (5, 20),
    "A1": (20, 50),
    "A2": (40, 100),
    "B1": (100, 180),
    "B2": (180, 300),
    "C1": (250, 400),
    "C2": (300, 500),
}

LEVEL_ORDER = list(COURSE_RANGES.keys())

VALID_ERROR_TAGS = {
    "verb-tense",
    "verb-form",
    "subject-verb-agreement",
    "modal-verbs",
    "passive-voice",
    "conditionals",
    "articles",
    "determiners",
    "pronouns",
    "plural-noun",
    "countable-uncountable",
    "prepositions",
    "word-order",
    "missing-word",
    "extra-word",
    "comparatives-superlatives",
    "relative-clauses",
    "question-formation",
    "negation",
    "gerund-infinitive",
    "word-choice",
    "collocation",
    "false-friend",
    "word-form",
    "register",
    "repetition",
    "spelling",
    "capitalization",
    "punctuation",
    "apostrophe",
    "run-on-sentence",
    "sentence-fragment",
    "connectors",
    "cohesion",
    "paragraphing",
    "topic-sentence",
    "task-response",
    "off-topic",
    "too-short",
    "tone-formality",
}

VALID_WARMUP_TYPES = {"gap-fill", "reorder", "fix-the-error", "choose"}
VALID_SCAFFOLDS = {"frames", "wordbank", "checklist", "outline", "none"}
ID_REGEX = re.compile(r"^[a-z0-9-]{1,80}$")


def w(
    wtype: str,
    prompt: str,
    options: list[str],
    answer: str,
    hint: str,
) -> dict[str, Any]:
    """Build a warmup item matching warmupsSchema."""
    return {
        "type": wtype,
        "prompt": prompt,
        "options": options,
        "answer": answer,
        "hint": hint,
    }


def make_lesson(
    level: str,
    lesson_id: str,
    title: str,
    markdown: str,
    model_text: str,
    warmups: list[dict[str, Any]],
    genre: str,
    prompt: str,
    scaffold: str,
    frames: list[str],
    word_bank: list[str],
    checklist: list[str],
    is_checkpoint: bool,
    task_id: str | None = None,
    min_words: int | None = None,
    max_words: int | None = None,
) -> dict[str, Any]:
    """Build a lesson object strictly conforming to lessonsSchema and taskSchema."""
    lo, hi = COURSE_RANGES[level]
    resolved_task_id = task_id or f"{lesson_id}-task"
    task_obj: dict[str, Any] = {
        "id": resolved_task_id,
        "title": title,
        "genre": genre,
        "prompt": prompt,
        "scaffold": scaffold,
        "frames": frames,
        "wordBank": word_bank,
        "checklist": checklist,
        "minWords": min_words if min_words is not None else lo,
        "maxWords": max_words if max_words is not None else hi,
        "isCheckpoint": is_checkpoint,
        "targetLevel": level,
    }
    return {
        "id": lesson_id,
        "title": title,
        "miniLesson": {
            "markdown": markdown,
            "modelText": model_text,
        },
        "warmups": warmups,
        "task": task_obj,
    }


def make_unit(
    level: str,
    order: int,
    unit_id: str,
    title: str,
    theme: str,
    outcome: str,
    grammar_focus: list[str],
    vocabulary: list[str],
    lessons: list[dict[str, Any]],
) -> dict[str, Any]:
    """Build a unit object strictly conforming to unitSchema."""
    return {
        "id": unit_id,
        "level": level,
        "order": order,
        "title": title,
        "theme": theme,
        "outcome": outcome,
        "grammarFocus": grammar_focus,
        "vocabulary": vocabulary,
        "lessons": lessons,
    }


# ============================================================================
# PART 1: ZERO-TO-HERO CORE PATH (PRE_A1, A1, A2 — Units 1 to 9)
# ============================================================================

CORE_UNITS: list[dict[str, Any]] = [
    # --- PRE_A1 (5 to 20 words) ---
    make_unit(
        level="PRE_A1",
        order=1,
        unit_id="first-words",
        title="Words about me",
        theme="Identity and personal basics",
        outcome="Write accurate Subject + Verb + Object clauses about your name, role, and interests.",
        grammar_focus=["capitalization", "punctuation", "word-order", "articles"],
        vocabulary=["student", "designer", "engineer", "teacher", "books", "music", "coffee", "tea"],
        lessons=[
            make_lesson(
                level="PRE_A1",
                lesson_id="first-words-1",
                title="Names and roles",
                markdown=(
                    "### Building Your First Clause\n"
                    "Every English statement needs a **Subject** (*I*) and a **Verb** (*am*). "
                    "When you name your job or role in the singular, always place **a** or **an** before the noun.\n\n"
                    "- **Pattern**: `I am + [Name].` / `I am + a/an + [role].`\n"
                    "- **Punctuation rule**: Start every sentence with a capital letter and finish with a full stop (`.`)."
                ),
                model_text="I am Lin. I am a student. I study in Hanoi.",
                warmups=[
                    w("choose", "Choose the sentence with correct word order.", ["I am Lin.", "I Lin am.", "Am I Lin."], "I am Lin.", "Put 'am' directly after 'I'."),
                    w("gap-fill", "Complete the role sentence: 'I am ___ student.'", ["a", "an", "the"], "a", "Use 'a' before a singular noun starting with a consonant sound."),
                    w("fix-the-error", "Fix the missing article: 'I am designer.'", ["I am a designer.", "I a designer am.", "I am designer."], "I am a designer.", "Singular jobs and roles need 'a' or 'an'."),
                ],
                genre="simple sentences",
                prompt="Write two or three short sentences stating your name, your role (such as student or worker), and your city.",
                scaffold="frames",
                frames=["I am [Name].", "I am a [role].", "I live in [city]."],
                word_bank=["student", "worker", "designer", "teacher", "live", "study"],
                checklist=[
                    "Begin every sentence with a capital letter and end with a full stop",
                    "Include 'a' or 'an' before your singular role",
                    "Write between 5 and 20 words using your real or chosen details",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="PRE_A1",
                lesson_id="first-words-2",
                title="Things I like",
                markdown=(
                    "### Expressing Likes with Plural & Uncountable Nouns\n"
                    "To talk about things you enjoy in general, place **like** after **I** followed by a **plural noun** (*books*, *movies*) "
                    "or an **uncountable noun** (*music*, *coffee*) without *the*.\n\n"
                    "- **Pattern**: `I like + [plural/uncountable noun].`\n"
                    "- **Common trap**: Do not write *I am like music*. Use the action verb *like* by itself."
                ),
                model_text="I like quiet mornings. I like hot coffee and good books.",
                warmups=[
                    w("reorder", "Put the words in the correct Subject-Verb-Object order.", ["I like music.", "Music like I.", "Like I music."], "I like music.", "Start with the subject 'I', then the verb 'like'."),
                    w("fix-the-error", "Remove the extra verb: 'I am like green tea.'", ["I like green tea.", "I am like green tea.", "I liking green tea."], "I like green tea.", "Do not combine 'am' with the base verb 'like'."),
                    w("choose", "Which sentence uses correct punctuation at the end?", ["I like books.", "I like books", "i like books."], "I like books.", "Always capitalize 'I' and finish with a full stop."),
                ],
                genre="simple sentences",
                prompt="Write two short sentences about two or three everyday things you like (such as food, drinks, or hobbies).",
                scaffold="frames",
                frames=["I like [thing].", "I like [adjective] [thing] and [thing]."],
                word_bank=["coffee", "tea", "music", "books", "movies", "rain", "mornings"],
                checklist=[
                    "Use 'I like' without adding 'am'",
                    "Use plural nouns (books) or uncountable nouns (music, tea)",
                    "Check capital letters and full stops",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="PRE_A1",
                lesson_id="first-words-3",
                title="My first introduction",
                markdown=(
                    "### Unit 1 Checkpoint: Three-Sentence Self-Introduction\n"
                    "Combine your identity, your role, and what you enjoy into a clean three-sentence micro-profile.\n\n"
                    "- **Sentence 1**: Your name.\n"
                    "- **Sentence 2**: Your role with `a` or `an`.\n"
                    "- **Sentence 3**: Two things you like joined with `and`."
                ),
                model_text="I am Minh. I am an engineer. I like tea and jazz music.",
                warmups=[
                    w("gap-fill", "Complete the sentence: 'I am ___ engineer.'", ["an", "a", "the"], "an", "Use 'an' before a vowel sound like 'e'."),
                    w("fix-the-error", "Fix the capitalization error: 'i am Kim. I like art.'", ["I am Kim. I like art.", "i am Kim. I like art.", "I am kim. i like art."], "I am Kim. I like art.", "The pronoun 'I' and proper names always start with a capital letter."),
                    w("choose", "Choose the complete sentence.", ["I like noodle soup.", "I noodle soup.", "Like noodle soup."], "I like noodle soup.", "Every sentence needs both a subject ('I') and a verb ('like')."),
                ],
                genre="simple sentences",
                prompt="Introduce yourself in three short sentences: state your name, your role, and two things you like.",
                scaffold="frames",
                frames=["I am [Name].", "I am a/an [role].", "I like [item] and [item]."],
                word_bank=["student", "engineer", "nurse", "music", "books", "coffee", "sports"],
                checklist=[
                    "Include your name, role, and two liked items",
                    "Use 'a' or 'an' accurately before your role",
                    "Proofread capital letters and full stops",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="PRE_A1",
        order=2,
        unit_id="people-and-places",
        title="People and places",
        theme="Describing surroundings and companions",
        outcome="Describe people and everyday places using singular/plural 'be' verbs, adjectives, and prepositions.",
        grammar_focus=["subject-verb-agreement", "prepositions", "articles", "word-order"],
        vocabulary=["friend", "office", "classroom", "park", "quiet", "busy", "clean", "near"],
        lessons=[
            make_lesson(
                level="PRE_A1",
                lesson_id="people-and-places-1",
                title="Describing one person",
                markdown=(
                    "### Third-Person Singular Descriptions (`He is` / `She is`)\n"
                    "When describing one friend, colleague, or family member, pair **He**, **She**, or **My friend** with **is**.\n\n"
                    "- **Pattern**: `My friend is [Name]. He/She is + [adjective].`\n"
                    "- **Adjective rule**: Adjectives (*kind*, *tall*, *helpful*) never take a plural `-s` in English."
                ),
                model_text="My friend is Lan. She is a nurse. She is very kind.",
                warmups=[
                    w("gap-fill", "Choose the correct verb: 'My friend ___ very helpful.'", ["is", "am", "are"], "is", "Use 'is' for one person (he, she, my friend)."),
                    w("fix-the-error", "Fix the adjective error: 'She is very kinds.'", ["She is very kind.", "She are very kind.", "She is very kinds."], "She is very kind.", "Never add '-s' to an adjective."),
                    w("reorder", "Arrange the words into a clear statement.", ["He is a good teacher.", "He a teacher good is.", "Is he a teacher good."], "He is a good teacher.", "Put the adjective 'good' before the noun 'teacher'."),
                ],
                genre="simple sentences",
                prompt="Write two or three short sentences about one person you know: give their name, role, and one quality.",
                scaffold="frames",
                frames=["My [person] is [Name].", "He/She is a [role].", "He/She is [adjective]."],
                word_bank=["friend", "sister", "brother", "teacher", "kind", "smart", "funny", "helpful"],
                checklist=[
                    "Use 'is' with he, she, or a singular person",
                    "Keep adjectives without '-s'",
                    "Stay within 5 to 20 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="PRE_A1",
                lesson_id="people-and-places-2",
                title="Where I am today",
                markdown=(
                    "### Naming Places with `in`, `at`, and `near`\n"
                    "Use **in** for enclosed rooms, cities, or parks (*in the library*, *in Da Nang*), **at** for functional locations (*at home*, *at work*), "
                    "and **near** for closeness (*near my house*).\n\n"
                    "- **Pattern**: `I am in/at [place]. It is [adjective].`"
                ),
                model_text="I am in a small cafe. It is quiet and clean.",
                warmups=[
                    w("gap-fill", "Fill in the preposition: 'I am ___ home today.'", ["at", "in", "on"], "at", "Use the fixed expression 'at home' or 'at work'."),
                    w("choose", "Which pronoun replaces 'the cafe' in the second sentence?", ["It is quiet.", "He is quiet.", "They is quiet."], "It is quiet.", "Use 'It' for a single place or object."),
                    w("fix-the-error", "Fix the missing verb: 'The room very bright.'", ["The room is very bright.", "The room are very bright.", "The room very bright."], "The room is very bright.", "English sentences need 'is' before an adjective phrase."),
                ],
                genre="simple sentences",
                prompt="Write two short sentences saying where you are right now and describing that place with two adjectives.",
                scaffold="frames",
                frames=["I am in/at [place].", "It is [adjective] and [adjective]."],
                word_bank=["home", "work", "cafe", "library", "park", "quiet", "bright", "busy", "clean"],
                checklist=[
                    "Name your current place with 'in' or 'at'",
                    "Describe the place using 'It is' plus adjectives",
                    "Check punctuation and word count (5-20 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="PRE_A1",
                lesson_id="people-and-places-3",
                title="A person in a place",
                markdown=(
                    "### Unit 2 Checkpoint: Combining People and Places\n"
                    "Bring together a person, their location, and a short description of the setting.\n\n"
                    "- **Plural check**: When talking about yourself and another person (*My friend and I* / *We*), use **are**."
                ),
                model_text="Ben and I are in the library. The room is quiet today.",
                warmups=[
                    w("gap-fill", "Choose the correct verb: 'My sister and I ___ at the park.'", ["are", "is", "am"], "are", "Two people form a plural subject ('we'), so use 'are'."),
                    w("fix-the-error", "Fix the agreement error: 'The parks is big.'", ["The park is big.", "The parks is big.", "The park are big."], "The park is big.", "Match singular 'The park' with singular 'is'."),
                    w("reorder", "Order the words to describe a place.", ["The office is near my home.", "The office near is my home.", "Near my home the office is."], "The office is near my home.", "Subject ('The office') + verb ('is') + location phrase ('near my home')."),
                ],
                genre="simple sentences",
                prompt="Write two or three short sentences about where you or a friend are today and what the place is like.",
                scaffold="frames",
                frames=["[Person] and I are in/at [place].", "The [place] is [adjective]."],
                word_bank=["friend", "colleague", "office", "park", "cafe", "quiet", "sunny", "warm"],
                checklist=[
                    "Match singular subjects with 'is' and plural subjects with 'are'",
                    "Include a location phrase with 'in', 'at', or 'near'",
                    "Write 5 to 20 words with clean punctuation",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="PRE_A1",
        order=3,
        unit_id="small-actions",
        title="Small daily actions",
        theme="Everyday routines and times",
        outcome="Write simple present-tense action statements with accurate verb forms and time phrases.",
        grammar_focus=["verb-tense", "subject-verb-agreement", "prepositions", "word-order"],
        vocabulary=["wake", "walk", "cook", "read", "work", "morning", "evening", "night"],
        lessons=[
            make_lesson(
                level="PRE_A1",
                lesson_id="small-actions-1",
                title="Morning actions",
                markdown=(
                    "### Present Simple Actions with `I`\n"
                    "Use base action verbs (*wake up*, *drink*, *walk*, *eat*) after **I** to describe what you do every day.\n\n"
                    "- **Pattern**: `I + [verb] + [object] + in the morning.`\n"
                    "- **Time phrase**: Use **in the morning** or **at 7 o'clock** at the end of the clause."
                ),
                model_text="I wake up at six. I drink warm water in the morning.",
                warmups=[
                    w("gap-fill", "Complete the time phrase: 'I drink coffee ___ the morning.'", ["in", "on", "at"], "in", "Use 'in' with parts of the day: in the morning, in the evening."),
                    w("choose", "Choose the natural action sentence.", ["I walk to work at eight.", "I am walk to work at eight.", "I walking to work at eight."], "I walk to work at eight.", "Use the simple base verb 'walk' for daily habits."),
                    w("reorder", "Arrange the morning habit sentence.", ["I eat bread at seven.", "I at seven eat bread.", "Eat I bread at seven."], "I eat bread at seven.", "Keep the verb and object ('eat bread') together before the time."),
                ],
                genre="simple sentences",
                prompt="Write two short sentences about what you do in the morning and what time you do it.",
                scaffold="frames",
                frames=["I [verb] at [time].", "I [verb] [object] in the morning."],
                word_bank=["wake up", "drink", "eat", "walk", "tea", "breakfast", "seven", "eight"],
                checklist=[
                    "Use base action verbs after 'I' without 'am'",
                    "Use 'at' for clock times and 'in the morning' for part of the day",
                    "Keep total length between 5 and 20 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="PRE_A1",
                lesson_id="small-actions-2",
                title="What another person does",
                markdown=(
                    "### Adding `-s` / `-es` for `He` and `She`\n"
                    "In the present simple, add **`-s`** or **`-es`** to the verb when the subject is one other person (*he*, *she*, *my mother*).\n\n"
                    "- **Examples**: `I cook` → `She cooks` | `I work` → `He works` | `I watch` → `He watches`"
                ),
                model_text="My brother works in a bank. He takes the bus every day.",
                warmups=[
                    w("gap-fill", "Choose the correct verb form: 'My mother ___ dinner at six.'", ["cooks", "cook", "cooking"], "cooks", "Add '-s' to the present simple verb for 'my mother' (she)."),
                    w("fix-the-error", "Fix the verb agreement: 'He read a book at night.'", ["He reads a book at night.", "He read a book at night.", "He reading a book at night."], "He reads a book at night.", "Third-person singular ('He') needs 'reads'."),
                    w("choose", "Which time phrase uses the correct preposition?", ["at night", "in night", "on night"], "at night", "We say 'in the morning/evening', but 'at night'."),
                ],
                genre="simple sentences",
                prompt="Write two short sentences about two daily actions a family member or friend does.",
                scaffold="frames",
                frames=["My [person] [verb+s] in/at [place].", "He/She [verb+s] [object] every day."],
                word_bank=["works", "cooks", "reads", "takes", "drinks", "drives", "every day", "at night"],
                checklist=[
                    "Add '-s' or '-es' to verbs with he, she, or a singular person",
                    "Include a place or time phrase",
                    "Write 5 to 20 words total",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="PRE_A1",
                lesson_id="small-actions-3",
                title="Evening routine snapshot",
                markdown=(
                    "### Unit 3 Checkpoint: Complete Daily Action Snapshot\n"
                    "Show that you can contrast your own daily action (`I + base verb`) with another person's action (`He/She + verb-s`)."
                ),
                model_text="I cook dinner in the evening. My sister washes the dishes at night.",
                warmups=[
                    w("fix-the-error", "Fix the verb ending: 'I cooks rice in the evening.'", ["I cook rice in the evening.", "I cooks rice in the evening.", "I cooking rice in the evening."], "I cook rice in the evening.", "Do not add '-s' to the verb when the subject is 'I'."),
                    w("gap-fill", "Select the right verb: 'She ___ English after dinner.'", ["studies", "study", "studying"], "studies", "For 'she', 'study' changes to 'studies'."),
                    w("reorder", "Order the evening sentence accurately.", ["We sleep at ten o'clock.", "We at ten o'clock sleep.", "Sleep we at ten o'clock."], "We sleep at ten o'clock.", "Subject ('We') + verb ('sleep') + time phrase ('at ten o'clock')."),
                ],
                genre="simple sentences",
                prompt="Write two or three short sentences about your evening routine and one action someone at home or a friend does.",
                scaffold="frames",
                frames=["I [verb] [object] in the evening.", "My [person] [verb+s] [object] at night."],
                word_bank=["cook", "read", "study", "rest", "washes", "watches", "reads", "evening"],
                checklist=[
                    "Use base verb after 'I' and verb + '-s/-es' after 'he/she'",
                    "Include at least one time expression",
                    "Finish every sentence with a full stop",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- A1 (20 to 50 words) ---
    make_unit(
        level="A1",
        order=1,
        unit_id="first-messages",
        title="First connected messages",
        theme="Introductions, invitations, and short notes",
        outcome="Connect 3 to 5 simple sentences using 'and', 'but', and 'because' in friendly everyday messages.",
        grammar_focus=["connectors", "verb-tense", "prepositions", "punctuation"],
        vocabulary=["introduce", "neighbor", "weekend", "invite", "free", "afternoon", "because", "together"],
        lessons=[
            make_lesson(
                level="A1",
                lesson_id="about-me",
                task_id="about-me-task",
                title="About me message",
                markdown=(
                    "### Connecting Sentences with `and` and `because`\n"
                    "Instead of writing five choppy clauses, join related ideas with **and** and explain your reason with **because**.\n\n"
                    "- **Addition**: `I live in Ho Chi Minh City, and I work at a design studio.`\n"
                    "- **Reason**: `I practice writing every evening because I need English for my job.`"
                ),
                model_text=(
                    "Hello! My name is Nam, and I live in Da Nang. I work as a junior developer at a small tech company. "
                    "I study English every evening because I want to write clear emails to my team."
                ),
                warmups=[
                    w("gap-fill", "Choose the best connector: 'I study English ___ I want to travel abroad.'", ["because", "but", "or"], "because", "Use 'because' to introduce a reason or goal."),
                    w("fix-the-error", "Remove the redundant connector: 'Because I like coffee, so I buy it every morning.'", ["Because I like coffee, I buy it every morning.", "Because I like coffee, so I buy it every morning.", "I like coffee, because so I buy it."], "Because I like coffee, I buy it every morning.", "In English, never use both 'because' and 'so' in the same sentence."),
                    w("reorder", "Build a connected introduction sentence.", ["I live in Hanoi, and I work in a hospital.", "I live in Hanoi, I and work in a hospital.", "In Hanoi I live, and work in a hospital I."], "I live in Hanoi, and I work in a hospital.", "Join two complete clauses with ', and'."),
                ],
                genre="short message",
                prompt="Write a short introduction message (20-50 words) to a new study group: share who you are, what you do, and why you are learning English writing.",
                scaffold="frames",
                frames=[
                    "Hi everyone! My name is ..., and I live in ...",
                    "I work/study as a ...",
                    "I practice English writing because I want to ...",
                ],
                word_bank=["because", "and", "student", "developer", "improve", "emails", "confident", "team"],
                checklist=[
                    "Include your name, your current role or study area, and your learning goal",
                    "Use 'because' without pairing it with 'so'",
                    "Write between 20 and 50 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A1",
                lesson_id="friendly-invitation",
                task_id="friendly-invitation-task",
                title="Friendly invitation",
                markdown=(
                    "### Inviting Someone with Day and Time Prepositions\n"
                    "A warm invitation states **what** you want to do, **when** (`on + day`, `at + time`), and **where** (`at/in + place`), "
                    "followed by a friendly question.\n\n"
                    "- **Preposition rule**: `on Saturday afternoon` | `at 3:00 PM` | `at the corner cafe`"
                ),
                model_text=(
                    "Hi Mai, are you free on Saturday afternoon? I want to try the new bakery near the park at three o'clock. "
                    "They have great iced tea and lemon cake. Let me know if you can join me!"
                ),
                warmups=[
                    w("gap-fill", "Complete the invitation: 'Are you free ___ Sunday morning?'", ["on", "in", "at"], "on", "Use 'on' before specific days and day+part combinations like 'Sunday morning'."),
                    w("choose", "Choose the most natural closing line for a friendly note.", ["Let me know if you can come!", "I command you to reply now.", "Yours faithfully, Sir."], "Let me know if you can come!", "Friendly messages end with a warm, casual check."),
                    w("fix-the-error", "Fix the question word order: 'You are free at five o'clock?'", ["Are you free at five o'clock?", "Free are you at five o'clock?", "Do you free at five o'clock?"], "Are you free at five o'clock?", "Move 'Are' before 'you' to form a yes/no question."),
                ],
                genre="short message",
                prompt="Write a short message (20-50 words) inviting a friend to meet for coffee, a meal, or a walk this weekend. Include the day, time, and place.",
                scaffold="frames",
                frames=[
                    "Hi [Name], are you free on [day]?",
                    "I want to go to [place] at [time] because ...",
                    "Let me know if you can join me!",
                ],
                word_bank=["Saturday", "Sunday", "afternoon", "cafe", "park", "dinner", "together", "free"],
                checklist=[
                    "Specify the day (with 'on'), time (with 'at'), and meeting place",
                    "Include one short reason why the plan sounds fun",
                    "End with a friendly question or closing line",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A1",
                lesson_id="first-messages-3",
                title="Replying to a friend's note",
                markdown=(
                    "### Unit 4 Checkpoint: Accepting or Suggesting a New Time with `but`\n"
                    "When replying to an invitation, thank your friend first. If you need a different time, use **but** to explain the conflict "
                    "and suggest a clear alternative."
                ),
                model_text=(
                    "Hi Mai, thanks for your message! I would love to try the new bakery with you, "
                    "but I have a dentist appointment at three on Saturday. Can we meet at four thirty instead?"
                ),
                warmups=[
                    w("gap-fill", "Choose the right connector: 'I want to join you, ___ I work until four on Saturday.'", ["but", "because", "so"], "but", "Use 'but' to contrast what you want with an obstacle."),
                    w("reorder", "Arrange the polite counter-suggestion.", ["Can we meet on Sunday morning instead?", "We can meet instead on Sunday morning?", "Can meet we on Sunday morning instead?"], "Can we meet on Sunday morning instead?", "Start the suggestion question with 'Can we + base verb'."),
                    w("fix-the-error", "Fix the modal verb error: 'Can we meeting at five?'", ["Can we meet at five?", "Can we meets at five?", "Can we meeting at five?"], "Can we meet at five?", "Always use the base verb ('meet') after 'can'."),
                ],
                genre="short message",
                prompt="Write a short reply (20-50 words) to a friend's weekend invitation: thank them, explain why you are busy at their suggested time using 'but', and propose a new time.",
                scaffold="wordbank",
                frames=[],
                word_bank=["thanks", "would love to", "but", "busy", "class", "appointment", "instead", "Sunday"],
                checklist=[
                    "Thank your friend warmly at the start",
                    "Use 'but' to explain your schedule conflict",
                    "Propose a specific alternative time or day",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="A1",
        order=2,
        unit_id="daily-routines",
        title="Daily routines and habits",
        theme="Sequencing work, study, and leisure habits",
        outcome="Describe a multi-step weekday or weekend routine using time sequencers and frequency adverbs.",
        grammar_focus=["word-order", "verb-tense", "connectors", "prepositions"],
        vocabulary=["usually", "always", "sometimes", "first", "then", "after that", "before", "relax"],
        lessons=[
            make_lesson(
                level="A1",
                lesson_id="daily-routines-1",
                title="Frequency adverbs in my day",
                markdown=(
                    "### Placing Frequency Adverbs (`always`, `usually`, `sometimes`, `never`)\n"
                    "Frequency adverbs tell the reader how often an action happens.\n\n"
                    "- **Before action verbs**: `I usually start work at eight thirty.`\n"
                    "- **After `am / is / are`**: `I am never late for class.`"
                ),
                model_text=(
                    "On weekdays, I usually wake up at six thirty and make black coffee. "
                    "I always take the metro to my office because the traffic is heavy. "
                    "In the evening, I sometimes cook pasta and read before bed."
                ),
                warmups=[
                    w("choose", "Where does 'usually' go with an action verb?", ["I usually eat lunch at noon.", "I eat usually lunch at noon.", "Usually I am eat lunch at noon."], "I usually eat lunch at noon.", "Put frequency adverbs directly before the main action verb."),
                    w("fix-the-error", "Fix the word order with 'be': 'She always is early for work.'", ["She is always early for work.", "She always is early for work.", "Always she is early for work."], "She is always early for work.", "Put 'always' after 'am/is/are'."),
                    w("gap-fill", "Complete the routine: 'I ___ drink coffee at night because it keeps me awake.'", ["never", "always", "usually"], "never", "Choose the frequency word that matches 'it keeps me awake'."),
                ],
                genre="short message",
                prompt="Write a short description (20-50 words) of your typical weekday using at least two frequency adverbs (always, usually, sometimes, or never).",
                scaffold="wordbank",
                frames=[],
                word_bank=["usually", "always", "sometimes", "never", "weekdays", "breakfast", "office", "evening"],
                checklist=[
                    "Place frequency adverbs before action verbs and after 'am/is/are'",
                    "Describe at least three actions from your weekday",
                    "Keep word count between 20 and 50 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A1",
                lesson_id="daily-routines-2",
                title="Sequencing steps with first, then, after that",
                markdown=(
                    "### Guiding the Reader Through Time (`First,`, `Then,`, `After that,`)\n"
                    "When actions happen one after another, use sequence markers at the start of sentences so your routine flows smoothly.\n\n"
                    "- **Sequence**: `First, I check my messages. Then, I plan my top three tasks. After that, I join our morning meeting.`"
                ),
                model_text=(
                    "Every morning at work, I follow a simple routine. First, I make a cup of green tea and open my notebook. "
                    "Then, I reply to urgent client emails. After that, I focus on my main project until noon."
                ),
                warmups=[
                    w("reorder", "Order these three sequence markers logically.", ["First -> Then -> After that", "After that -> First -> Then", "Then -> After that -> First"], "First -> Then -> After that", "'First' always opens a sequence of actions."),
                    w("gap-fill", "Complete the transition: 'First, I wash the vegetables. ___ , I chop the onions.'", ["Then", "Because", "But"], "Then", "Use 'Then' or 'Next' to show the second step in a sequence."),
                    w("fix-the-error", "Fix the punctuation: 'After that I start my homework.'", ["After that, I start my homework.", "After, that I start my homework.", "After that I starting my homework."], "After that, I start my homework.", "Place a comma after introductory sequence phrases like 'First,' and 'After that,'."),
                ],
                genre="short message",
                prompt="Write 3 to 4 sentences (20-50 words) explaining how you start your morning, study session, or workday using 'First,', 'Then,', and 'After that,'.",
                scaffold="wordbank",
                frames=[],
                word_bank=["First", "Then", "After that", "Finally", "notebook", "messages", "review", "focus"],
                checklist=[
                    "Use 'First,', 'Then,', and 'After that,' with a comma after each",
                    "Keep all verbs in the present simple tense",
                    "Write 20 to 50 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A1",
                lesson_id="daily-routines-3",
                title="Comparing weekday and weekend habits",
                markdown=(
                    "### Unit 5 Checkpoint: Contrasting Routines\n"
                    "Combine frequency adverbs, sequence words, and **but** to show how your weekend pace differs from your weekday schedule."
                ),
                model_text=(
                    "From Monday to Friday, I always wake up at six because my class starts early. "
                    "On Sunday, I sleep until eight thirty. First, I make pancakes with my family, and then we walk by the lake."
                ),
                warmups=[
                    w("gap-fill", "Choose the right preposition for a day: '___ Sunday, I visit my grandparents.'", ["On", "In", "At"], "On", "Use 'On' before days of the week."),
                    w("fix-the-error", "Fix the verb tense consistency: 'On Saturdays, I usually play badminton and cooked lunch.'", ["On Saturdays, I usually play badminton and cook lunch.", "On Saturdays, I usually played badminton and cook lunch.", "On Saturdays, I usually playing badminton and cooking lunch."], "On Saturdays, I usually play badminton and cook lunch.", "Keep both habit verbs ('play' and 'cook') in the present simple."),
                    w("choose", "Which sentence cleanly contrasts two habits?", ["I work hard on weekdays, but I rest on Sunday.", "Although I work hard on weekdays, but I rest on Sunday.", "I work hard on weekdays, because I rest on Sunday."], "I work hard on weekdays, but I rest on Sunday.", "Use a single contrast word ('but') between the two clauses."),
                ],
                genre="short message",
                prompt="Write a short paragraph (20-50 words) comparing what you usually do on weekdays with how you spend your Saturday or Sunday.",
                scaffold="checklist",
                frames=[],
                word_bank=["weekdays", "usually", "early", "weekend", "First", "then", "relax", "family"],
                checklist=[
                    "Mention both your weekday habit and your weekend routine",
                    "Include at least one frequency adverb and one sequence marker",
                    "Check that all habit verbs stay in the present simple",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="A1",
        order=3,
        unit_id="simple-requests",
        title="Simple requests and polite notes",
        theme="Asking for help and borrowing or scheduling",
        outcome="Write polite, clear requests to classmates, neighbors, or coworkers using modal verbs and reasons.",
        grammar_focus=["modal-verbs", "tone-formality", "punctuation", "word-order"],
        vocabulary=["could", "please", "borrow", "notes", "absent", "tomorrow", "return", "appreciate"],
        lessons=[
            make_lesson(
                level="A1",
                lesson_id="simple-requests-1",
                title="Asking a favor with Can you and Could you",
                markdown=(
                    "### Polite Requests (`Can you...?` / `Could you please...?`)\n"
                    "Direct commands (*Send me the file*) sound rude in messages. Soften your request with **Could you please + base verb**.\n\n"
                    "- **Pattern**: `Could you please + [base verb] + [object]?`"
                ),
                model_text=(
                    "Hi Linh, I missed our afternoon lecture today because I had a fever. "
                    "Could you please send me a photo of your biology notes? I will read them tonight. Thank you so much!"
                ),
                warmups=[
                    w("choose", "Which request sounds polite and natural to a classmate?", ["Could you please share the slide link with me?", "Give me the slide link now.", "You send slide link to me."], "Could you please share the slide link with me?", "'Could you please + base verb' is polite and clear."),
                    w("fix-the-error", "Fix the verb after 'Could you': 'Could you please helping me with this box?'", ["Could you please help me with this box?", "Could you please helps me with this box?", "Could you please to help me with this box?"], "Could you please help me with this box?", "Always use the bare infinitive ('help') after 'Could you (please)'."),
                    w("gap-fill", "Complete the context clause: 'I missed class today ___ I had a train delay.'", ["because", "so", "but"], "because", "Give a brief reason with 'because' before asking a favor."),
                ],
                genre="short message",
                prompt="Write a polite message (20-50 words) to a classmate or coworker asking to borrow an item or get notes from a meeting you missed.",
                scaffold="frames",
                frames=[
                    "Hi [Name], I missed [event] today because ...",
                    "Could you please [base verb] ...?",
                    "Thank you so much for your help!",
                ],
                word_bank=["missed", "because", "Could you please", "notes", "slides", "borrow", "tonight", "thank you"],
                checklist=[
                    "Give a brief reason before making your request",
                    "Use 'Could you please' followed by a base verb",
                    "Close with a polite thank-you",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A1",
                lesson_id="simple-requests-2",
                title="Leaving a clear note for a neighbor or roommate",
                markdown=(
                    "### Action + Promise Notes\n"
                    "When asking a neighbor or roommate for a small favor, tell them **what you need**, **when**, and **what you will do in return** (`I will...`)."
                ),
                model_text=(
                    "Hi Alex, a courier is delivering my book parcel around two o'clock today, "
                    "but I am at the office until six. Could you please sign for it? I will pick it up tonight. Thanks!"
                ),
                warmups=[
                    w("gap-fill", "Choose the future form for a promise: 'I ___ bring the charger back at seven.'", ["will", "am", "did"], "will", "Use 'I will + base verb' to make a clear promise."),
                    w("reorder", "Order the polite request sentence.", ["Could you please water my plants on Friday?", "Could please you water on Friday my plants?", "Water my plants could you please on Friday?"], "Could you please water my plants on Friday?", "Keep 'Could you please + verb + object + time' in order."),
                    w("fix-the-error", "Fix the preposition: 'I am in the office until at six.'", ["I am at the office until six.", "I am in the office until at six.", "I am at the office on six."], "I am at the office until six.", "Use 'until six' directly without adding 'at'."),
                ],
                genre="short message",
                prompt="Write a short note (20-50 words) to a roommate or neighbor asking for a small favor while you are out, and promise when you will follow up.",
                scaffold="wordbank",
                frames=[],
                word_bank=["parcel", "delivery", "until", "Could you please", "keep", "I will", "tonight", "thanks"],
                checklist=[
                    "Explain why you are away or unavailable",
                    "Make a specific request with 'Could you please'",
                    "Include a follow-up promise with 'I will'",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A1",
                lesson_id="simple-requests-3",
                title="Requesting a quick schedule change",
                markdown=(
                    "### Unit 6 Checkpoint: Polite Rescheduling Message\n"
                    "Combine an apology (`I am sorry, but...`), a brief reason, and a polite request to move a meeting or study session to a new time."
                ),
                model_text=(
                    "Hi Teacher Sara, I am sorry, but I cannot attend our speaking class at four o'clock tomorrow "
                    "because my manager scheduled a team meeting. Could we please move our lesson to Friday at five? Thank you!"
                ),
                warmups=[
                    w("fix-the-error", "Fix the verb after 'cannot': 'I cannot attending the meeting today.'", ["I cannot attend the meeting today.", "I cannot attends the meeting today.", "I not can attend the meeting today."], "I cannot attend the meeting today.", "Follow 'cannot' with the base verb 'attend'."),
                    w("choose", "Which opening apologizes politely before asking for a change?", ["I am sorry, but I need to reschedule our call.", "Change our call time now.", "Why you make the call at four?"], "I am sorry, but I need to reschedule our call.", "'I am sorry, but...' softens bad news politely."),
                    w("gap-fill", "Complete the rescheduling question: 'Could we please move our session ___ Thursday?'", ["to", "at", "in"], "to", "We move an event 'from' one time 'to' another time."),
                ],
                genre="short message",
                prompt="Write a polite message (20-50 words) to a tutor, classmate, or coworker explaining why you cannot make a scheduled meeting tomorrow and asking to move it to a new day and time.",
                scaffold="checklist",
                frames=[],
                word_bank=["sorry", "cannot", "attend", "because", "Could we please", "move", "Friday", "thank you"],
                checklist=[
                    "Open with a polite apology and explain why you cannot attend",
                    "Use 'Could we please' to propose a specific new day and time",
                    "Keep the message between 20 and 50 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- A2 (40 to 100 words) ---
    make_unit(
        level="A2",
        order=1,
        unit_id="connected-messages",
        title="Connected past stories and future plans",
        theme="Recounting weekend experiences and coordinating visits",
        outcome="Write cohesive 40 to 100 word messages combining past simple stories and future arrangements.",
        grammar_focus=["verb-tense", "connectors", "prepositions", "topic-sentence"],
        vocabulary=["visited", "explored", "delicious", "weather", "excited", "arrive", "station", "itinerary"],
        lessons=[
            make_lesson(
                level="A2",
                lesson_id="past-weekend",
                task_id="past-weekend-task",
                title="Sharing a past weekend story",
                markdown=(
                    "### Writing a Mini-Narrative in the Past Simple\n"
                    "A good weekend update starts with an **overall summary sentence**, recounts 2–3 connected events in the **past simple** "
                    "(*went*, *tried*, *walked*), and closes with how you felt.\n\n"
                    "- **Watch irregular verbs**: `go → went` | `eat → ate` | `see → saw` | `have → had`"
                ),
                model_text=(
                    "I had a wonderful and relaxing weekend in Hoi An with my cousin. On Saturday morning, we rented bicycles "
                    "and rode through the quiet rice fields outside the town. For lunch, we ate fresh cao lau noodles at a small local market. "
                    "In the evening, we walked along the river and watched the colorful lanterns. I felt completely refreshed by Sunday night."
                ),
                warmups=[
                    w("fix-the-error", "Fix the past tense verb: 'Last Saturday, we go to the night market and eat street food.'", ["Last Saturday, we went to the night market and ate street food.", "Last Saturday, we goed to the night market and eated street food.", "Last Saturday, we going to the night market and eating street food."], "Last Saturday, we went to the night market and ate street food.", "Use irregular past forms 'went' and 'ate' for completed past actions."),
                    w("gap-fill", "Choose the best closing adjective: 'After the trip, I felt very ___.'", ["relaxed", "relaxing", "relax"], "relaxed", "Use '-ed' adjectives ('relaxed', 'excited') to describe how a person feels."),
                    w("reorder", "Order the opening topic sentence.", ["I had a busy but enjoyable weekend with my family.", "A weekend busy but enjoyable I had with my family.", "With my family had I a busy weekend enjoyable."], "I had a busy but enjoyable weekend with my family.", "Start with 'I had a [adjectives] weekend' to set the scene."),
                ],
                genre="connected message",
                prompt="Write a connected paragraph (40-100 words) telling a friend about a memorable weekend or day trip you took recently. Include where you went, two things you did, and how you felt.",
                scaffold="wordbank",
                frames=[],
                word_bank=["wonderful", "Saturday", "visited", "walked", "ate", "watched", "evening", "refreshed"],
                checklist=[
                    "Open with a clear first sentence summarizing the weekend or trip",
                    "Keep all story actions in the past simple tense",
                    "End with a sentence describing how you felt (40-100 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A2",
                lesson_id="plan-a-visit",
                task_id="plan-a-visit-task",
                title="Planning a friend's visit",
                markdown=(
                    "### Future Plans with `going to` and `will`\n"
                    "When organizing a visit, use **be going to + verb** for planned activities and **will + verb** for helpful offers "
                    "(*I will meet you at the station*).\n\n"
                    "- **Link ideas**: Use *First*, *On Saturday afternoon*, and *If the weather is nice* to structure the plan."
                ),
                model_text=(
                    "I am so excited about your visit to Hanoi next month! When your train arrives on Friday evening, "
                    "I will pick you up at the main station. On Saturday morning, we are going to walk around Hoan Kiem Lake "
                    "and drink egg coffee at my favorite old cafe. If the weather is sunny on Sunday, we can visit the ceramics village too."
                ),
                warmups=[
                    w("gap-fill", "Complete the time clause: 'When you ___ at the airport, I will meet you at Gate 2.'", ["arrive", "will arrive", "arrived"], "arrive", "After 'When' in a future time clause, use the present simple ('arrive'), not 'will arrive'."),
                    w("choose", "Which sentence expresses a planned weekend activity?", ["On Saturday, we are going to visit the art museum.", "On Saturday, we visited the art museum.", "On Saturday, we going visit the art museum."], "On Saturday, we are going to visit the art museum.", "Use 'are going to + base verb' for prior future plans."),
                    w("fix-the-error", "Fix the conditional clause: 'If it will rain tomorrow, we can go to the cinema.'", ["If it rains tomorrow, we can go to the cinema.", "If it will rain tomorrow, we can go to the cinema.", "If it rained tomorrow, we will go to the cinema."], "If it rains tomorrow, we can go to the cinema.", "Use the present simple ('rains') in the 'If' part of a first conditional."),
                ],
                genre="connected message",
                prompt="Write a warm message (40-100 words) to a friend who is visiting your city soon. Tell them how you will meet them and describe two activities you are going to do together.",
                scaffold="checklist",
                frames=[],
                word_bank=["excited", "arrive", "pick you up", "are going to", "favorite", "weather", "local", "weekend"],
                checklist=[
                    "Use 'I will' for an offer (such as picking them up) and 'we are going to' for planned activities",
                    "Use present simple after 'When' or 'If'",
                    "Write 40 to 100 words in a warm, welcoming tone",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A2",
                lesson_id="connected-messages-3",
                title="Thank-you note after a visit",
                markdown=(
                    "### Unit 7 Checkpoint: Linking Past Gratitude to Future Plans\n"
                    "A great post-visit message combines **Past Simple** (thanking the host for specific moments) with **Future** (inviting them to visit you next)."
                ),
                model_text=(
                    "Dear Tuan, thank you so much for hosting me in Da Lat last weekend! I arrived home safely two hours ago. "
                    "I really enjoyed our morning hike through the pine forest and the hotpot dinner your mother cooked for us. "
                    "Next summer, you must visit me in Nha Trang so I can take you snorkeling. See you soon!"
                ),
                warmups=[
                    w("fix-the-error", "Fix the preposition after 'thank you': 'Thank you for host me last weekend.'", ["Thank you for hosting me last weekend.", "Thank you for host me last weekend.", "Thank you to hosting me last weekend."], "Thank you for hosting me last weekend.", "After a preposition like 'for', always use the '-ing' gerund form ('hosting')."),
                    w("gap-fill", "Choose the right verb tense: 'I ___ home safely at eight o'clock tonight.'", ["arrived", "arrive", "have arrive"], "arrived", "Use the past simple ('arrived') with a finished past time expression."),
                    w("choose", "Which sentence smoothly connects a past highlight with a future invitation?", ["I loved the boat tour, and I hope I can show you my hometown soon.", "I love the boat tour yesterday, and I showed you my hometown tomorrow.", "Because I loved the boat tour, but come to my city."], "I loved the boat tour, and I hope I can show you my hometown soon.", "It shifts accurately from past ('loved') to present/future hope ('hope I can show')."),
                ],
                genre="connected message",
                prompt="Write a thank-you message (40-100 words) to a friend or relative after staying with them: let them know you got home safely, mention two specific highlights from the trip, and invite them to visit you in the future.",
                scaffold="checklist",
                frames=[],
                word_bank=["thank you for", "safely", "really enjoyed", "especially", "delicious", "next time", "visit", "soon"],
                checklist=[
                    "Thank your host using 'thank you for + verb-ing' or 'thank you for + noun'",
                    "Describe two specific past highlights using past simple verbs",
                    "End with a warm future invitation (40-100 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="A2",
        order=2,
        unit_id="explain-a-problem",
        title="Explaining an everyday problem",
        theme="Reporting issues to landlords, shops, or support teams",
        outcome="Write clear, polite 40 to 100 word problem reports stating what went wrong, how it affects you, and what resolution you need.",
        grammar_focus=["verb-tense", "connectors", "tone-formality", "task-response"],
        vocabulary=["issue", "broken", "working", "order", "damaged", "repair", "replacement", "convenient"],
        lessons=[
            make_lesson(
                level="A2",
                lesson_id="explain-a-problem-1",
                title="Reporting a home or apartment issue",
                markdown=(
                    "### The 3-Part Problem Formula: What + Since When + Impact\n"
                    "When messaging a landlord or building manager, state the problem in your very first sentence, explain when it started, "
                    "and ask for a repair visit.\n\n"
                    "- **Structure**:\n"
                    "  1. **Topic sentence**: `I am writing to report a problem with [item] in Apartment [number].`\n"
                    "  2. **Details**: `It stopped working yesterday evening, so...`\n"
                    "  3. **Action**: `Could you please send a technician...?`"
                ),
                model_text=(
                    "Hello Mr. Khanh, I am writing from Apartment 4B to report a problem with the kitchen water heater. "
                    "It stopped working yesterday evening, and now there is only cold water in the sink and shower. "
                    "Could you please send a plumber to check it tomorrow morning? I work from home all day, so anytime after nine is convenient."
                ),
                warmups=[
                    w("choose", "Which opening line gives the reader immediate clarity?", ["I am writing from Room 302 to report a leak in the bathroom ceiling.", "Everything is terrible in my room today.", "Hello, I want to talk about many things."], "I am writing from Room 302 to report a leak in the bathroom ceiling.", "State your apartment/room number and the exact issue in the first sentence."),
                    w("gap-fill", "Connect the cause and result: 'The air conditioner makes a loud noise, ___ I cannot sleep at night.'", ["so", "because", "although"], "so", "Use 'so' before the result or consequence of the problem."),
                    w("fix-the-error", "Fix the verb form after 'stopped': 'The Wi-Fi router stopped to work this morning.'", ["The Wi-Fi router stopped working this morning.", "The Wi-Fi router stopped to work this morning.", "The Wi-Fi router stop working this morning."], "The Wi-Fi router stopped working this morning.", "Use 'stop + verb-ing' ('stopped working') to mean an activity or machine ceased functioning."),
                ],
                genre="connected message",
                prompt="Write a polite message (40-100 words) to your landlord or building manager reporting something broken in your home (such as the air conditioner, Wi-Fi, or water heater), explaining the impact, and stating when someone can come fix it.",
                scaffold="checklist",
                frames=[],
                word_bank=["report", "Apartment", "stopped working", "yesterday", "so", "technician", "repair", "convenient"],
                checklist=[
                    "Open with a topic sentence naming your room/apartment and the broken item",
                    "Explain when the issue started and how it affects you using 'so'",
                    "Request a repair and share your available time window",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A2",
                lesson_id="explain-a-problem-2",
                title="Messaging customer support about an online order",
                markdown=(
                    "### Customer Support Messages: Order Number + Defect + Solution\n"
                    "Customer service agents handle hundreds of tickets. Make yours easy to solve by including your **order reference**, "
                    "**what arrived wrong**, and whether you want a **replacement** or a **refund**."
                ),
                model_text=(
                    "Hello Customer Support, I received my online order #4821 this morning, but there is an issue with the desk lamp inside. "
                    "The glass shade has a large crack on the side, and the power switch does not turn on. "
                    "I have attached two photos of the damage. Could you please send me a replacement lamp or arrange a full refund?"
                ),
                warmups=[
                    w("gap-fill", "Complete the defect description: 'There is a scratch ___ the screen of the tablet.'", ["on", "in", "at"], "on", "Use 'on' for surfaces like a screen, cover, or side."),
                    w("fix-the-error", "Fix the negative present simple: 'The headphones does not charging.'", ["The headphones do not charge.", "The headphones does not charge.", "The headphones do not charging."], "The headphones do not charge.", "Plural 'headphones' takes 'do not + base verb'."),
                    w("choose", "Which closing clearly states the desired resolution?", ["Could you please send a replacement or issue a refund?", "You must feel ashamed of your shop.", "I don't know what to do now."], "Could you please send a replacement or issue a refund?", "Calmly naming your preferred resolution gets faster results."),
                ],
                genre="connected message",
                prompt="Write a customer support message (40-100 words) about an item you ordered online that arrived damaged or incorrect. Include an order number, two specific details about the problem, and the solution you want.",
                scaffold="checklist",
                frames=[],
                word_bank=["order", "received", "damaged", "scratch", "broken", "attached", "replacement", "refund"],
                checklist=[
                    "Include a specific order number and item name in the opening sentence",
                    "Describe two concrete details about what is wrong with the item",
                    "Ask politely for a replacement or refund (40-100 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A2",
                lesson_id="explain-a-problem-3",
                title="Explaining a study or work delay before the deadline",
                markdown=(
                    "### Unit 8 Checkpoint: Proactive Delay & Extension Request\n"
                    "When you cannot meet a deadline, write **before** the deadline passes. State what you have already finished, "
                    "explain the unexpected problem without making excuses, and propose a realistic new submission time."
                ),
                model_text=(
                    "Dear Professor Minh, I am writing to ask for a short extension on my history essay due this Friday. "
                    "I have already completed my research notes and the first two sections, but my laptop hard drive failed last night. "
                    "The repair shop will return my computer tomorrow afternoon. Could I please submit the final essay by Sunday at 6:00 PM?"
                ),
                warmups=[
                    w("gap-fill", "Show completed progress: 'I have already ___ the data table for the report.'", ["finished", "finish", "finishing"], "finished", "After 'have already', use the past participle ('finished' / 'completed')."),
                    w("reorder", "Order the polite extension request.", ["Could I please submit the assignment on Monday morning?", "Could please I submit on Monday morning the assignment?", "Submit the assignment could I please on Monday morning?"], "Could I please submit the assignment on Monday morning?", "Use 'Could I please + base verb + object + time'."),
                    w("choose", "Why is mentioning your completed progress effective in an extension request?", ["It shows you worked responsibly before the unexpected problem happened.", "It makes the message longer so the reader gets tired.", "It avoids saying when you will finish."], "It shows you worked responsibly before the unexpected problem happened.", "Showing completed steps builds trust with teachers and managers."),
                ],
                genre="connected message",
                prompt="Write a polite message (40-100 words) to a teacher or manager asking for a 1-2 day extension on a project or assignment. State what you have already completed, explain the unexpected technical or health issue, and propose an exact new deadline.",
                scaffold="checklist",
                frames=[],
                word_bank=["extension", "already completed", "unfortunately", "unexpected", "submit", "by", "appreciate", "understanding"],
                checklist=[
                    "State the specific assignment or task in the first sentence",
                    "Mention what progress you have already made before explaining the problem",
                    "Propose a specific new day and time for submission (40-100 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="A2",
        order=3,
        unit_id="experience-and-advice",
        title="Sharing experiences and practical advice",
        theme="Recommending places, habits, and tips based on personal experience",
        outcome="Write helpful 40 to 100 word paragraphs combining personal experience with clear advice using modals and comparatives.",
        grammar_focus=["modal-verbs", "comparatives-superlatives", "connectors", "paragraphing"],
        vocabulary=["recommend", "should", "worth", "crowded", "cheaper", "comfortable", "avoid", "tip"],
        lessons=[
            make_lesson(
                level="A2",
                lesson_id="experience-and-advice-1",
                title="Giving travel or city tips with should and shouldn't",
                markdown=(
                    "### Grounding Advice in Personal Experience\n"
                    "Advice is much more persuasive when you pair **you should / you shouldn't + base verb** with a brief reason or personal observation.\n\n"
                    "- **Pattern**: `You should visit the market before 8:00 AM because it gets very crowded later.`"
                ),
                model_text=(
                    "If you visit Sa Pa in the winter, here are two useful tips from my trip last month. "
                    "First, you should pack warm waterproof shoes because the mountain trails are often wet and foggy. "
                    "Second, you shouldn't buy souvenirs at the main bus stop because the small village shops are much cheaper and friendlier."
                ),
                warmups=[
                    w("gap-fill", "Choose the right comparative form: 'Taking the morning train is ___ than taking the night bus.'", ["more comfortable", "comfortabler", "most comfortable"], "more comfortable", "For long adjectives (3+ syllables), use 'more + adjective'."),
                    w("fix-the-error", "Fix the verb after 'shouldn't': 'You shouldn't to carry too much cash.'", ["You shouldn't carry too much cash.", "You shouldn't to carry too much cash.", "You shouldn't carrying too much cash."], "You shouldn't carry too much cash.", "Follow 'should' and 'shouldn't' directly with a base verb (no 'to')."),
                    w("choose", "Which sentence backs up advice with a clear reason?", ["You should book tickets online because the station queue takes an hour.", "You should book tickets online.", "Book tickets online or don't go."], "You should book tickets online because the station queue takes an hour.", "Adding 'because + concrete reason' makes advice actionable."),
                ],
                genre="connected message",
                prompt="Write a short advice paragraph (40-100 words) for someone visiting your hometown or favorite city for the first time. Give one 'you should' tip and one 'you shouldn't' tip, each with a clear reason.",
                scaffold="checklist",
                frames=[],
                word_bank=["visit", "should", "shouldn't", "because", "crowded", "cheaper", "local", "early"],
                checklist=[
                    "Open with a topic sentence naming the city or place",
                    "Include both 'you should' and 'you shouldn't' followed by base verbs",
                    "Support each tip with a reason or comparative adjective (40-100 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A2",
                lesson_id="experience-and-advice-2",
                title="Writing a helpful review of a cafe, course, or app",
                markdown=(
                    "### Balanced Short Reviews: What Works + One Drawback + Who It Suits\n"
                    "A trustworthy review describes specific strengths, notes one honest limitation with **however** or **but**, "
                    "and concludes with who will enjoy it most."
                ),
                model_text=(
                    "I have used the Forest study app for three months, and it is great for staying focused. "
                    "The timer is simple to set up, and planting virtual trees keeps me away from social media during study blocks. "
                    "However, the statistics page is a bit hard to read on a small phone screen. Overall, I strongly recommend it to students."
                ),
                warmups=[
                    w("gap-fill", "Choose the best transition for a minor drawback: 'The coffee is rich and smooth. ___, the upstairs seating area is quite noisy.'", ["However", "Therefore", "Because"], "However", "Use 'However,' at the start of a sentence to introduce a contrasting limitation."),
                    w("fix-the-error", "Fix the preposition after 'recommend': 'I recommend this cafe for anyone who works remotely.'", ["I recommend this cafe to anyone who works remotely.", "I recommend this cafe for anyone who works remotely.", "I recommend to this cafe anyone."], "I recommend this cafe to anyone who works remotely.", "Standard collocation: 'recommend [something] to [someone]'."),
                    w("reorder", "Arrange the concluding recommendation.", ["Overall, this course is well worth the price for beginners.", "Overall, well worth the price is this course for beginners.", "For beginners worth the price overall this course is."], "Overall, this course is well worth the price for beginners.", "Start the closing sentence with 'Overall,' followed by subject + verb."),
                ],
                genre="connected message",
                prompt="Write a short, balanced review (40-100 words) of a cafe, book, course, or app you have used recently. Mention two things you liked, one small drawback using 'However,' or 'but', and who you recommend it to.",
                scaffold="checklist",
                frames=[],
                word_bank=["recently", "helpful", "easy to", "However", "small", "Overall", "recommend", "beginners"],
                checklist=[
                    "Name the place, app, or course in your opening sentence",
                    "Include two specific positives and one minor drawback",
                    "End with an 'Overall,' recommendation stating who it suits best",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="A2",
                lesson_id="experience-and-advice-3",
                title="Advising a friend on building a new habit",
                markdown=(
                    "### Unit 9 Checkpoint: Empathy + Personal Experience + Step-by-Step Advice\n"
                    "When a friend asks how to build a habit (like exercising, waking up early, or learning vocabulary), "
                    "validate their struggle first, share what worked for you, and give two manageable steps."
                ),
                model_text=(
                    "I completely understand why waking up early feels difficult at first! Last year, I always hit my alarm three times "
                    "and felt tired all morning. Two small changes helped me a lot. First, you should put your phone across the room "
                    "so you have to stand up. Second, drink a full glass of water right away. Start with just fifteen minutes earlier this week!"
                ),
                warmups=[
                    w("choose", "Why is sharing your own past mistake a strong way to open an advice message?", ["It builds warmth and shows your advice comes from real experience.", "It proves you are better than your friend.", "It replaces the need to give any tips."], "It builds warmth and shows your advice comes from real experience.", "Brief personal context makes advice encouraging rather than bossy."),
                    w("gap-fill", "Complete the purpose clause: 'Leave your running shoes by the door ___ you see them in the morning.'", ["so", "because", "although"], "so", "Use 'so' to show the intended result of the action."),
                    w("fix-the-error", "Fix the comparative phrase: 'Fifteen minutes is easy than one hour.'", ["Fifteen minutes is easier than one hour.", "Fifteen minutes is more easy than one hour.", "Fifteen minutes is easiest than one hour."], "Fifteen minutes is easier than one hour.", "Two-syllable adjectives ending in '-y' ('easy') change to '-ier' ('easier') before 'than'."),
                ],
                genre="connected message",
                prompt="Write an encouraging message (40-100 words) to a friend who wants to build a healthy or productive habit (such as exercising, reading, or practicing English daily). Share a brief personal experience and give two practical tips.",
                scaffold="checklist",
                frames=[],
                word_bank=["understand", "at first", "helped me", "First", "should", "Second", "easier", "start"],
                checklist=[
                    "Open warmly and share one sentence of your own past experience",
                    "Give two concrete, manageable tips using 'First,' and 'Second,'",
                    "Keep total length between 40 and 100 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
]


# ============================================================================
# PART 2: ZERO-TO-HERO CORE PATH (B1 & B2 — Units 10 to 15)
# ============================================================================

CORE_UNITS.extend([
    # --- B1 (100 to 180 words) ---
    make_unit(
        level="B1",
        order=1,
        unit_id="clear-paragraphs",
        title="Clear topic sentences and structured paragraphs",
        theme="Local changes, balanced viewpoints, and PEEL paragraphing",
        outcome="Write unified 100 to 180 word paragraphs with a focused topic sentence, developed explanations, and a concluding link.",
        grammar_focus=["topic-sentence", "paragraphing", "connectors", "cohesion"],
        vocabulary=["transform", "resident", "pedestrian", "furthermore", "on the other hand", "overall", "benefit", "drawback"],
        lessons=[
            make_lesson(
                level="B1",
                lesson_id="a-local-change",
                task_id="a-local-change-task",
                title="Describing a positive local change",
                markdown=(
                    "### The PEEL Paragraph Architecture\n"
                    "At B1, every paragraph should defend one central idea using **PEEL**:\n\n"
                    "1. **Point (Topic Sentence)**: State the change and its main impact in sentence one.\n"
                    "2. **Explanation**: Unpack *how* or *why* that change matters (`In the past..., whereas now...`).\n"
                    "3. **Example**: Give a concrete local detail (*for instance, families now gather...*).\n"
                    "4. **Link**: Close by tying the detail back to community well-being."
                ),
                model_text=(
                    "Turning the old lakeside road in my neighborhood into a weekend pedestrian zone has greatly improved daily life for local residents. "
                    "Two years ago, the narrow street was packed with noisy motorbikes and delivery trucks, which made walking unsafe for children and elderly people. "
                    "Since the district council closed the road to traffic on Friday evenings, the atmosphere has changed completely. "
                    "For example, small book stalls and acoustic street musicians now set up along the water, and families gather on benches after dinner. "
                    "Local cafe owners also report having more customers because people enjoy sitting outdoors without exhaust fumes. "
                    "Overall, this simple traffic rule has turned a stressful road into a welcoming community space."
                ),
                warmups=[
                    w("choose", "Which opening makes the strongest B1 topic sentence?", ["Converting the empty corner lot into a community garden has brought neighbors closer together.", "There is a garden on the corner of my street.", "I want to write about a place near my house."], "Converting the empty corner lot into a community garden has brought neighbors closer together.", "A strong topic sentence names both the subject and its clear impact."),
                    w("gap-fill", "Select the transition that introduces a concrete illustration: 'The new metro line saves commuters time. ___, my trip to the city center dropped from fifty minutes to twenty.'", ["For example", "Nevertheless", "On the contrary"], "For example", "Use 'For example,' or 'For instance,' to ground a claim in a real detail."),
                    w("fix-the-error", "Fix the present perfect tense after 'Since': 'Since the park opened last spring, it becomes very popular.'", ["Since the park opened last spring, it has become very popular.", "Since the park opened last spring, it became very popular.", "Since the park opened last spring, it is become very popular."], "Since the park opened last spring, it has become very popular.", "When a past event ('Since the park opened') shapes the present, use the present perfect ('has become') in the main clause."),
                ],
                genre="paragraphs",
                prompt="Write a well-structured paragraph (100-180 words) about a recent change in your neighborhood, school, or workplace. Open with a clear topic sentence, contrast how things were before vs. now, give one specific example, and end with a summary sentence.",
                scaffold="outline",
                frames=[],
                word_bank=["improved", "in the past", "since", "for example", "residents", "furthermore", "overall", "community"],
                checklist=[
                    "Open with a topic sentence stating both the change and its main effect",
                    "Contrast the past situation with the present using 'since' or 'whereas'",
                    "Include a concrete example and a concluding summary line (100-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="a-balanced-opinion",
                task_id="a-balanced-opinion-task",
                title="Weighing both sides in a balanced opinion paragraph",
                markdown=(
                    "### Signposting Concession before Stating Your View\n"
                    "Thoughtful writers acknowledge the strongest point on the other side before explaining why their own conclusion holds more weight.\n\n"
                    "- **Concession**: `On the one hand, working from home eliminates commuting costs...`\n"
                    "- **Pivot**: `On the other hand, / However, Junior staff often miss out on informal mentoring...`\n"
                    "- **Verdict**: `For this reason, a hybrid schedule offers the healthiest balance.`"
                ),
                model_text=(
                    "Studying online offers impressive flexibility for busy adults, yet a hybrid format remains more effective for long-term language learning. "
                    "On the one hand, recorded video lessons allow full-time workers to review grammar explanations at their own pace late at night without spending an hour in city traffic. "
                    "This convenience helps many beginners stay consistent during busy weeks. "
                    "On the other hand, studying completely alone at a screen can quickly feel isolating, and learners rarely get immediate feedback when they mispronounce a word or hesitate in conversation. "
                    "When students meet a teacher and classmates in person even once a week, they build accountability and confidence much faster. "
                    "Therefore, combining self-paced online practice with live group sessions gives learners the best of both worlds."
                ),
                warmups=[
                    w("gap-fill", "Pair the contrast signal: 'On the one hand, city apartments are close to public transport. ___, they are often cramped and expensive.'", ["On the other hand", "As a result", "In addition"], "On the other hand", "'On the one hand' pairs naturally with 'On the other hand' to weigh two sides."),
                    w("fix-the-error", "Fix the gerund subject agreement: 'Working from home every day make new employees feel isolated.'", ["Working from home every day makes new employees feel isolated.", "Working from home every day making new employees feel isolated.", "Work from home every day make new employees feel isolated."], "Working from home every day makes new employees feel isolated.", "A gerund phrase ('Working from home every day') acts as a singular subject and takes 'makes'."),
                    w("choose", "Where should your final recommendation appear in a balanced B1 paragraph?", ["In the concluding sentence, introduced by 'Therefore,' or 'For this reason,'", "Hidden inside the first example", "Left out completely so the reader has to guess"], "In the concluding sentence, introduced by 'Therefore,' or 'For this reason,'", "A clear concluding verdict resolves the two sides for the reader."),
                ],
                genre="paragraphs",
                prompt="Write a balanced paragraph (100-180 words) weighing the pros and cons of either working from home, online learning, or cashless payments, and conclude with your personal recommendation.",
                scaffold="outline",
                frames=[],
                word_bank=["flexibility", "on the one hand", "convenience", "on the other hand", "isolating", "accountability", "therefore", "balance"],
                checklist=[
                    "Introduce the topic and your balanced stance in the first sentence",
                    "Use 'On the one hand' and 'On the other hand' (or 'However') to examine both sides",
                    "End with a clear concluding recommendation (100-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="clear-paragraphs-3",
                title="Defending a practical workplace or campus policy",
                markdown=(
                    "### Unit 10 Checkpoint: Cohesive Policy Recommendation Paragraph\n"
                    "Demonstrate full control of B1 paragraph structure by proposing a sensible change at work or school, "
                    "explaining two connected benefits, addressing one potential concern, and closing with a decisive link."
                ),
                model_text=(
                    "Introducing a quiet two-hour focus block every Tuesday and Thursday morning would significantly improve productivity across our product team. "
                    "Currently, engineers and designers receive constant chat notifications and short meeting requests throughout the morning, which makes it hard to complete complex tasks without making avoidable mistakes. "
                    "If the team agrees to pause non-urgent messages between nine and eleven o'clock, everyone will have uninterrupted time for deep work such as writing code or reviewing research. "
                    "Although some colleagues worry that urgent client questions might wait too long, we can easily solve this by keeping one rotating team member on call for emergencies. "
                    "Ultimately, protecting just four hours of quiet focus each week will reduce stress and help us deliver higher-quality work on time."
                ),
                warmups=[
                    w("gap-fill", "Complete the first conditional policy outcome: 'If we reduce unnecessary meetings, staff ___ more time for deep work.'", ["will have", "would had", "having"], "will have", "Use 'If + present simple, ... will + base verb' for realistic policy outcomes."),
                    w("fix-the-error", "Remove the double conjunction: 'Although some staff worry about delays, but a rotating schedule solves this.'", ["Although some staff worry about delays, a rotating schedule solves this.", "Although some staff worry about delays, but a rotating schedule solves this.", "Although some staff worrying about delays, so a schedule solves this."], "Although some staff worry about delays, a rotating schedule solves this.", "Never pair 'Although' with 'but' in the same sentence."),
                    w("choose", "What makes a concluding sentence effective at the end of a proposal paragraph?", ["It echoes the topic sentence's core goal and summarizes the practical payoff.", "It introduces a brand-new unrelated complaint.", "It repeats the first sentence word for word."], "It echoes the topic sentence's core goal and summarizes the practical payoff.", "A strong closing sentence reinforces the benefit without copying the opening verbatim."),
                ],
                genre="paragraphs",
                prompt="Write a single cohesive paragraph (100-180 words) proposing one practical improvement for your workplace, university, or study routine. State the proposal in your topic sentence, explain the current problem, address one objection using 'Although', and close with the expected benefit.",
                scaffold="checklist",
                frames=[],
                word_bank=["significantly", "currently", "uninterrupted", "although", "solve", "ultimately", "productivity", "quality"],
                checklist=[
                    "State the specific proposal and its main benefit in the topic sentence",
                    "Address one potential concern using 'Although' (without 'but')",
                    "Keep the entire response unified in one 100 to 180 word paragraph",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="B1",
        order=2,
        unit_id="evidence-and-examples",
        title="Supporting claims with concrete evidence and examples",
        theme="Replacing vague generalizations with specific illustrations and cause-effect chains",
        outcome="Transform weak, repetitive claims into persuasive 100 to 180 word paragraphs backed by concrete examples and cause-and-effect chains.",
        grammar_focus=["cohesion", "connectors", "relative-clauses", "word-choice"],
        vocabulary=["specifically", "for instance", "consequently", "demonstrate", "measurable", "tend to", "contribute", "habit"],
        lessons=[
            make_lesson(
                level="B1",
                lesson_id="evidence-and-examples-1",
                title="Replacing vague claims with concrete examples",
                markdown=(
                    "### Moving from Abstract Claims to Concrete Proof\n"
                    "Weak writing repeats vague adjectives (*Reading is very good because it is helpful and nice*). "
                    "Strong B1 writing follows a general claim with **Specifically,** or **For instance,** and names **who, what, and what measurable result occurs**."
                ),
                model_text=(
                    "Keeping a short daily expense log is one of the most effective ways for young professionals to save money without feeling deprived. "
                    "Many people assume that only big purchases hurt their budget, yet small automatic habits often drain a bank account much faster. "
                    "For instance, when I tracked every purchase in a notebook for thirty days last autumn, I realized I was spending nearly forty dollars a week on afternoon delivery snacks and unused app subscriptions. "
                    "Once I saw those exact numbers on paper, I canceled two forgotten services and started packing fruit from home, which saved me over one hundred dollars in a single month. "
                    "By making invisible spending visible, a simple five-minute tracking habit puts you back in control of your finances."
                ),
                warmups=[
                    w("choose", "Which supporting sentence provides concrete B1 evidence instead of a vague generality?", ["For instance, switching from daily taxi rides to the metro saved me $85 in my first month.", "Saving money is very good and helps people in many different ways.", "Everyone knows that money is important for life every day."], "For instance, switching from daily taxi rides to the metro saved me $85 in my first month.", "Specific actions and numbers make your argument believable."),
                    w("gap-fill", "Add a non-defining relative clause to show result: 'I started preparing lunch at home, ___ cut my weekly food bill in half.'", ["which", "who", "where"], "which", "Use ', which' to refer back to the whole previous action and state its result."),
                    w("fix-the-error", "Fix the preposition in the time phrase: 'I tracked my expenses during thirty days.'", ["I tracked my expenses for thirty days.", "I tracked my expenses during thirty days.", "I tracked my expenses since thirty days."], "I tracked my expenses for thirty days.", "Use 'for' with a duration of time ('for thirty days', 'for three months')."),
                ],
                genre="paragraphs",
                prompt="Write a paragraph (100-180 words) explaining how one small daily or weekly habit (in finance, health, or study) creates a big positive result. Support your claim with a specific real or realistic example including numbers or concrete details.",
                scaffold="outline",
                frames=[],
                word_bank=["effective", "assume", "for instance", "realized", "specifically", "which", "saved", "control"],
                checklist=[
                    "Open with a clear claim about the habit and its payoff",
                    "Include a concrete example introduced by 'For instance,' or 'For example,'",
                    "Use at least one ', which' clause to show the result of an action (100-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="evidence-and-examples-2",
                title="Building cause-and-effect chains",
                markdown=(
                    "### Explaining *Why* an Example Works (`because of`, `as a result`, `consequently`)\n"
                    "Dropping an example into a paragraph is not enough—you must trace the **cause-and-effect chain** step by step:\n\n"
                    "- `Action A → leads to Intermediate Effect B → As a result, Final Outcome C`"
                ),
                model_text=(
                    "Replacing late-night screen time with thirty minutes of print reading noticeably improves both sleep quality and morning focus. "
                    "When people scroll through short videos or work emails in bed, the bright blue light and fast-moving updates keep the brain alert long after midnight. "
                    "Because of this mental stimulation, it takes much longer to fall into deep sleep, leaving workers groggy the next morning. "
                    "In contrast, reading a physical book under a warm lamp slows down breathing and signals to the body that the day is finished. "
                    "As a result, readers fall asleep faster and wake up with clearer concentration for their morning tasks. "
                    "Making this single evening swap is therefore an easy way to boost daily energy."
                ),
                warmups=[
                    w("gap-fill", "Distinguish 'because' vs. 'because of': 'Many commuters feel exhausted ___ the long traffic delays.'", ["because of", "because", "therefore"], "because of", "Use 'because of' before a noun phrase ('the long traffic delays'), and 'because' before a full subject+verb clause."),
                    w("choose", "Which transition signals the logical consequence of the preceding sentence?", ["As a result,", "Despite this,", "Meanwhile,"], "As a result,", "'As a result,' and 'Consequently,' highlight a direct effect."),
                    w("fix-the-error", "Fix the verb form after a preposition: 'By read a physical book, you help your mind unwind.'", ["By reading a physical book, you help your mind unwind.", "By read a physical book, you help your mind unwind.", "By to read a physical book, you help your mind unwind."], "By reading a physical book, you help your mind unwind.", "Use 'By + verb-ing' to explain the method or means by which an effect happens."),
                ],
                genre="paragraphs",
                prompt="Write a cause-and-effect paragraph (100-180 words) explaining why a common modern habit (such as multitasking, skipping breakfast, or scrolling late at night) harms productivity or health, and how a better alternative fixes it.",
                scaffold="outline",
                frames=[],
                word_bank=["because of", "in contrast", "as a result", "consequently", "stimulation", "concentration", "boost", "swap"],
                checklist=[
                    "Trace a clear step-by-step chain from cause to effect",
                    "Use 'because of + noun phrase' and 'As a result,' accurately",
                    "Contrast the harmful habit with a healthier alternative (100-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="evidence-and-examples-3",
                title="Avoiding overgeneralization with careful hedging",
                markdown=(
                    "### Unit 11 Checkpoint: Persuasive Paragraph with Hedging & Specific Proof\n"
                    "Absolute claims (*Everyone hates open offices*; *Public transport always fails*) are easy to dismiss. "
                    "Use natural B1 hedging (**tend to**, **often**, **in many cases**, **can**) paired with a concrete example."
                ),
                model_text=(
                    "While group brainstorming sessions are popular in many offices, asking team members to prepare written ideas beforehand tends to produce much stronger solutions. "
                    "In traditional open meetings, the loudest or most senior speakers often dominate the conversation during the first ten minutes. "
                    "Consequently, quieter colleagues who need a moment to reflect rarely share their most creative insights. "
                    "For example, when our marketing team switched to collecting anonymous five-minute notes before our monthly planning call, we received twice as many campaign proposals from junior designers. "
                    "Reviewing those written notes first allowed the group to evaluate ideas based on merit rather than speaking volume. "
                    "In most cases, ten minutes of silent preparation before a meeting leads to faster and fairer decisions."
                ),
                warmups=[
                    w("choose", "Which sentence uses realistic hedging instead of an exaggerated absolute claim?", ["Open-plan offices tend to increase distractions for tasks that require deep concentration.", "Nobody in the world can ever write a single line of code in an open office.", "Open-plan offices destroy 100% of companies immediately."], "Open-plan offices tend to increase distractions for tasks that require deep concentration.", "Verbs like 'tend to' and adverbs like 'often' make arguments credible and hard to refute."),
                    w("gap-fill", "Complete the relative clause: 'Colleagues ___ prefer time to reflect often contribute better ideas in writing.'", ["who", "which", "whose"], "who", "Use 'who' as the subject pronoun for people ('Colleagues')."),
                    w("fix-the-error", "Fix the comparison phrase: 'Written preparation produced twice as much proposals as before.'", ["Written preparation produced twice as many proposals as before.", "Written preparation produced twice as much proposals as before.", "Written preparation produced twice many proposals than before."], "Written preparation produced twice as many proposals as before.", "Use 'twice as many ... as' with countable plural nouns like 'proposals'."),
                ],
                genre="paragraphs",
                prompt="Write a persuasive paragraph (100-180 words) arguing for a better way to study, run meetings, or learn a skill. Use hedging ('tend to', 'often', 'in many cases'), a cause-and-effect link ('Consequently,'), and one concrete example.",
                scaffold="checklist",
                frames=[],
                word_bank=["tend to", "often", "consequently", "for example", "who", "evaluate", "merit", "in most cases"],
                checklist=[
                    "Avoid extreme absolutes ('always/everyone') by using 'tend to' or 'often'",
                    "Include a cause-and-effect transition ('Consequently,' or 'As a result,')",
                    "Provide one concrete example to prove your point (100-180 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="B1",
        order=3,
        unit_id="formal-email",
        title="Semi-formal and formal workplace emails",
        theme="Professional correspondence with clients, professors, and cross-functional teams",
        outcome="Write polished 100 to 180 word workplace and academic emails with appropriate register, indirect questions, and clear action items.",
        grammar_focus=["register", "tone-formality", "question-formation", "modal-verbs"],
        vocabulary=["regarding", "inquire", "attached", "wondered", "available", "confirm", "appreciate", "sincerely"],
        lessons=[
            make_lesson(
                level="B1",
                lesson_id="formal-email-1",
                title="Inquiring politely with indirect questions",
                markdown=(
                    "### Upgrading Direct Questions to Polite Indirect Questions\n"
                    "When emailing a client, professor, or external partner for the first time, replace blunt questions (*What is the price?*) "
                    "with **embedded indirect questions** that keep statement word order (`Subject + Verb`).\n\n"
                    "- **Direct**: `When does registration close?`\n"
                    "- **Indirect**: `Could you please let me know when registration closes?`"
                ),
                model_text=(
                    "Dear Ms. Tran,\n\n"
                    "I am writing to inquire about the intensive Business Writing workshop listed on your training center's website for next month. "
                    "I currently work as a project coordinator at a logistics firm in Hai Phong, and I want to improve the clarity of my client reports. "
                    "Could you please let me know whether the evening cohort still has available seats for the November session? "
                    "In addition, I would appreciate it if you could share the weekly syllabus and confirm whether course materials are included in the tuition fee.\n\n"
                    "Thank you in advance for your time and assistance.\n\n"
                    "Best regards,\n"
                    "Hoang Nguyen"
                ),
                warmups=[
                    w("fix-the-error", "Fix the word order in the indirect question: 'Could you please tell me how much does the course cost?'", ["Could you please tell me how much the course costs?", "Could you please tell me how much does the course cost?", "Could you please tell me how much cost the course?"], "Could you please tell me how much the course costs?", "Inside an indirect question ('Could you tell me...'), use normal statement order ('the course costs') without 'does'."),
                    w("gap-fill", "Choose the right connector for a yes/no indirect question: 'I would like to know ___ the sessions are recorded.'", ["whether", "what", "that"], "whether", "Use 'whether' or 'if' when embedding a yes/no question."),
                    w("choose", "Which opening line sets a clear, professional tone for an external inquiry?", ["I am writing to inquire about the upcoming UX Design certificate program.", "Hey, tell me everything about your UX class.", "I need information right now please."], "I am writing to inquire about the upcoming UX Design certificate program.", "'I am writing to inquire about...' states your purpose immediately and politely."),
                ],
                genre="paragraphs",
                prompt="Write a semi-formal inquiry email (100-180 words) to a training provider, conference organizer, or service vendor. Introduce your background briefly and ask two polite indirect questions about schedules, pricing, or materials.",
                scaffold="outline",
                frames=[],
                word_bank=["inquire about", "currently", "Could you please let me know", "whether", "would appreciate", "confirm", "assistance", "Best regards"],
                checklist=[
                    "Include a professional salutation ('Dear ...') and sign-off ('Best regards,')",
                    "State the purpose of your email in the first sentence",
                    "Use at least two indirect questions with statement word order (100-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="formal-email-2",
                title="Sending a clear project status update",
                markdown=(
                    "### The 3-Part Status Update: Completed + Blocker + Next Step\n"
                    "Managers and clients read status emails to answer three questions in thirty seconds:\n\n"
                    "1. **What is done?** (Present perfect: `We have finalized...`)\n"
                    "2. **What is blocked or needs input?** (`We are currently waiting on...`)\n"
                    "3. **What happens next and by when?** (`Once you confirm..., we will...`)"
                ),
                model_text=(
                    "Dear Mr. David,\n\n"
                    "I am writing to share a brief progress update on the mobile checkout redesign for Q4. "
                    "Over the past week, our design team has completed the user-testing interviews and finalized the updated payment screen wireframes, which are attached to this email as a PDF. "
                    "We are now ready to hand the files over to the frontend engineers, but we still need your confirmation on whether we should display local bank QR codes as the default payment option. "
                    "Could you please review page four of the attached deck and share your decision by Wednesday at 3:00 PM? "
                    "Once we receive your sign-off, we will begin sprint implementation on Thursday morning.\n\n"
                    "Kind regards,\n"
                    "Linh Pham"
                ),
                warmups=[
                    w("gap-fill", "Choose the best tense for recent project achievements: 'Our team ___ the database migration ahead of schedule.'", ["has completed", "completing", "was complete"], "has completed", "Use the present perfect ('has completed') to report recent milestones that matter now."),
                    w("choose", "Which call-to-action makes it easiest for a busy stakeholder to reply on time?", ["Could you please review section two and confirm your choice by Thursday at 5:00 PM?", "Let me know what you think whenever.", "Please read everything and do the needful."], "Could you please review section two and confirm your choice by Thursday at 5:00 PM?", "Name the exact page/section, the decision needed, and a specific deadline."),
                    w("fix-the-error", "Fix the preposition after 'waiting': 'We are currently waiting your feedback on the draft.'", ["We are currently waiting for your feedback on the draft.", "We are currently waiting your feedback on the draft.", "We are currently waiting to your feedback on the draft."], "We are currently waiting for your feedback on the draft.", "Use 'wait for + noun' (or the verb 'await + noun')."),
                ],
                genre="paragraphs",
                prompt="Write a clear project or study status update email (100-180 words) to a manager, client, or supervisor. Summarize two completed milestones, explain one decision or input you need from them, and give a specific deadline and next step.",
                scaffold="outline",
                frames=[],
                word_bank=["progress update", "has completed", "finalized", "attached", "confirmation", "whether", "Once we receive", "Kind regards"],
                checklist=[
                    "Use present perfect verbs to report completed work",
                    "Specify the exact decision or feedback you need from the recipient",
                    "Include a clear deadline and what will happen once they reply (100-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="formal-email-3",
                title="Following up on an unanswered request tactfully",
                markdown=(
                    "### Unit 12 Checkpoint: Tactful Follow-Up Without Sounding Impatient\n"
                    "When someone hasn't replied to an earlier email, avoid guilt-tripping (*Why didn't you answer me?*). "
                    "Briefly restate the context so they don't have to dig through their inbox, explain why the timeline matters, and make replying effortless."
                ),
                model_text=(
                    "Dear Ms. Hanh,\n\n"
                    "I hope your week is going well. I am following up on the catering proposal I sent last Tuesday regarding our annual partner workshop on November 18. "
                    "Because the venue requires our final guest count and menu selection by this Friday afternoon, I wanted to check whether your team has had a chance to review the vegetarian package options. "
                    "For your convenience, I have reattached the one-page summary table showing the per-person pricing for both menu tiers. "
                    "If you would like to adjust any dishes, I am happy to jump on a five-minute call tomorrow morning before eleven. "
                    "Thank you for your help in keeping our event preparations on track.\n\n"
                    "Best regards,\n"
                    "Minh Khoa"
                ),
                warmups=[
                    w("choose", "Which follow-up opening is polite, professional, and helpful?", ["I am following up on the budget draft I sent on Monday regarding the Q1 campaign.", "You still haven't answered my email from Monday.", "As per my last email, why are you ignoring me?"], "I am following up on the budget draft I sent on Monday regarding the Q1 campaign.", "Neutral, specific context refreshes the reader's memory without blame."),
                    w("gap-fill", "Complete the polite check: 'I wanted to check whether you have ___ a chance to review the contract.'", ["had", "have", "having"], "had", "Present perfect: 'have/has had a chance to + base verb'."),
                    w("fix-the-error", "Fix the gerund after a preposition: 'Thank you for help us meet the Friday deadline.'", ["Thank you for helping us meet the Friday deadline.", "Thank you for help us meet the Friday deadline.", "Thank you to help us meet the Friday deadline."], "Thank you for helping us meet the Friday deadline.", "After 'for', use the '-ing' gerund ('helping')."),
                ],
                genre="paragraphs",
                prompt="Write a tactful follow-up email (100-180 words) to a colleague, vendor, or client who has not replied to an important message from last week. Restate the context so they don't have to search their inbox, explain the upcoming deadline, and offer an easy way to respond.",
                scaffold="checklist",
                frames=[],
                word_bank=["following up on", "regarding", "had a chance to", "for your convenience", "reattached", "deadline", "on track", "Best regards"],
                checklist=[
                    "Remind the reader of the original topic and date without sounding accusing",
                    "Explain the practical reason for the upcoming deadline",
                    "Make replying easy by summarizing the question or reattaching key details (100-180 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- B2 (180 to 300 words) ---
    make_unit(
        level="B2",
        order=1,
        unit_id="formal-requests",
        title="Persuasive formal requests and resource proposals",
        theme="Pitching initiatives, budget requests, and policy exceptions with ROI",
        outcome="Write structured 180 to 300 word formal proposals that align requests with organizational goals, anticipate objections, and quantify impact.",
        grammar_focus=["register", "tone-formality", "conditionals", "cohesion"],
        vocabulary=["initiative", "allocate", "bottleneck", "mitigate", "return on investment", "feasible", "streamline", "approval"],
        lessons=[
            make_lesson(
                level="B2",
                lesson_id="formal-requests-1",
                title="Framing a training or tool budget request around team ROI",
                markdown=(
                    "### Reader-Centered Persuasion: Problem Cost → Proposed Solution → Measurable ROI\n"
                    "At B2, formal requests succeed when you frame them around **what the organization gains**, not just what you want.\n\n"
                    "- **Paragraph 1**: State the request clearly and link it to a current team bottleneck.\n"
                    "- **Paragraph 2**: Detail the cost, time commitment, and concrete deliverables.\n"
                    "- **Paragraph 3**: Offer a knowledge-sharing plan and request a specific sign-off."
                ),
                model_text=(
                    "Dear Ms. Lan,\n\n"
                    "I am writing to request approval to use $240 from our Q4 professional development budget to enroll in the four-week Automated Playwright Testing cohort starting on November 10. "
                    "During our last two release cycles, manual regression checks across mobile and desktop browsers took our QA and frontend team nearly fourteen hours per sprint, delaying Friday deployments twice.\n\n"
                    "This hands-on course focuses specifically on building parallel end-to-end test suites for Next.js applications and integrating them into GitHub Actions. "
                    "Because all live workshops take place on Tuesday evenings after 7:00 PM, participating will not overlap with my core sprint responsibilities or client meetings. "
                    "By the third week of the program, I will apply the course modules directly to automate our checkout and authentication flows, which currently account for sixty percent of our manual testing time.\n\n"
                    "To ensure the whole engineering group benefits from this investment, I will also host a forty-five-minute lunch-and-learn workshop in December and document a reusable starter template in our team wiki. "
                    "I have attached the full syllabus and invoice breakdown for your review. Please let me know if we can discuss this briefly during our one-on-one meeting on Thursday.\n\n"
                    "Sincerely,\n"
                    "Tuan Anh"
                ),
                warmups=[
                    w("choose", "Why is quantifying the current bottleneck (e.g., '14 hours of manual checks per sprint') persuasive in a budget request?", ["It shows decision-makers that the cost of the course solves a much larger ongoing operational cost.", "It complains about coworkers so the manager feels guilty.", "It hides the price of the training until the last sentence."], "It shows decision-makers that the cost of the course solves a much larger ongoing operational cost.", "Anchoring a small cost against a larger recurring pain point demonstrates clear ROI."),
                    w("gap-fill", "Complete the participle clause showing result: 'Manual regression checks took fourteen hours per sprint, ___ Friday deployments twice.'", ["delaying", "delayed", "to delay"], "delaying", "A present participle clause (', delaying...') compactly expresses the consequence of the main clause."),
                    w("fix-the-error", "Fix the preposition after 'enroll': 'I would like to enroll at the advanced data analytics workshop.'", ["I would like to enroll in the advanced data analytics workshop.", "I would like to enroll at the advanced data analytics workshop.", "I would like to enroll to the advanced data analytics workshop."], "I would like to enroll in the advanced data analytics workshop.", "Standard collocation: 'enroll in a course/program'."),
                ],
                genre="formal correspondence",
                prompt="Write a formal 3-paragraph email or memo (180-300 words) to your manager or department head requesting budget approval for a professional course, certification, or software tool. Quantify the current workflow problem it solves, reassure them about your schedule, and propose how you will share the value with the wider team.",
                scaffold="outline",
                frames=[],
                word_bank=["approval", "allocate", "bottleneck", "specifically", "overlap", "account for", "investment", "syllabus"],
                checklist=[
                    "Open by stating the exact request, cost, and the workflow bottleneck it addresses",
                    "Explain how you will manage your current workload and apply the tool or training immediately",
                    "Commit to a concrete team-wide benefit (such as a workshop or template) in the final paragraph (180-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="formal-requests-2",
                title="Proposing a process change and mitigating risks",
                markdown=(
                    "### Pre-empting Stakeholder Objections with Conditional Safeguards\n"
                    "Decision-makers hesitate when a proposal ignores operational risks. Dedicate a distinct section of your proposal to naming the primary risk and showing how a **built-in safeguard** (`Provided that...`, `To mitigate this risk,...`) neutralizes it."
                ),
                model_text=(
                    "Proposal: Transitioning Customer Onboarding from Manual Calls to Interactive Guided Workshops\n\n"
                    "Over the past quarter, our customer success team has welcomed forty-five new small-business accounts per month, nearly double our volume from early this year. "
                    "While our one-on-one onboarding calls worked well when we had twenty clients, scheduling individual forty-minute sessions now creates a nine-day waiting period before new users configure their first workspace. "
                    "During that nine-day gap, nearly a quarter of trial users become inactive.\n\n"
                    "To eliminate this bottleneck, I propose launching twice-weekly live group onboarding workshops every Tuesday and Thursday afternoon, paired with a self-serve five-minute setup checklist. "
                    "New customers will be able to join a live session within forty-eight hours of signing up, reducing our team's repetitive call load by approximately twelve hours per week.\n\n"
                    "To mitigate the risk that high-value enterprise clients might feel they are receiving less personalized attention, any account with ten or more seats will automatically retain a dedicated one-on-one kickoff call. "
                    "Additionally, we can run this model as a four-week pilot in November and compare seven-day activation rates before making the change permanent. "
                    "With your go-ahead this week, I will prepare the workshop slide deck by Monday."
                ),
                warmups=[
                    w("gap-fill", "Select the precise B2 verb for reducing risk: 'To ___ the risk of service interruptions, we will run the migration on Sunday night.'", ["mitigate", "enlarge", "provoke"], "mitigate", "'Mitigate a risk' is the standard professional collocation for reducing potential harm."),
                    w("choose", "Why is proposing a time-bound pilot ('a four-week pilot in November') effective in workplace proposals?", ["It lowers the perceived commitment by making the change reversible and data-driven.", "It shows you are unsure whether your idea makes sense.", "It delays taking any action for another year."], "It lowers the perceived commitment by making the change reversible and data-driven.", "Framing a change as a measurable pilot makes approval much easier."),
                    w("fix-the-error", "Fix the verb form after 'propose': 'I propose to launching twice-weekly group sessions.'", ["I propose launching twice-weekly group sessions.", "I propose to launching twice-weekly group sessions.", "I propose launched twice-weekly group sessions."], "I propose launching twice-weekly group sessions.", "Follow 'propose' with a gerund ('launching') or a 'that' clause."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph workplace or campus proposal (180-300 words) recommending a specific process change to save time or improve quality. Diagnose the current bottleneck with concrete numbers, explain how the new workflow operates, and include a safeguard or pilot period to mitigate potential risks.",
                scaffold="outline",
                frames=[],
                word_bank=["bottleneck", "inactive", "eliminate", "propose", "mitigate", "personalized", "pilot", "activation"],
                checklist=[
                    "Diagnose why the current process no longer scales in paragraph one",
                    "Detail the proposed workflow and expected time or quality savings in paragraph two",
                    "Include a specific risk-mitigation safeguard and a measurable pilot plan in paragraph three (180-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="formal-requests-3",
                title="Negotiating scope or timeline trade-offs professionally",
                markdown=(
                    "### Unit 13 Checkpoint: The Constructive Trade-Off Letter (`Yes, if...`)\n"
                    "When a client or director asks to add extra features without extending the deadline, avoid a flat refusal (*No, that is impossible*). "
                    "Instead, present **two clear, viable options** that make the trade-off between **scope** and **timeline** transparent."
                ),
                model_text=(
                    "Dear Mr. Minh,\n\n"
                    "Thank you for sharing the updated stakeholder feedback from yesterday's steering committee review. "
                    "We are glad to hear that the board responded positively to the new bilingual dashboard layout, and we understand why adding an automated CSV and PDF export module would be valuable for regional managers.\n\n"
                    "Because our current sprint schedule is fully allocated to completing security testing and accessibility checks before the November 15 launch, adding the custom export engine right now would require approximately forty additional engineering hours. "
                    "Rushing both tasks simultaneously would risk delaying our security audit or introducing formatting bugs into the main release.\n\n"
                    "To ensure we meet your highest priority without compromising platform stability, I would like to propose two options. "
                    "Under Option A, we keep the November 15 launch date for the core dashboard and deliver the automated PDF/CSV export in a fast-follow release on November 25. "
                    "Under Option B, we include the full export module in the initial launch and shift the go-live date by six business days to November 23. "
                    "Please let me know which path best supports your regional rollout plan by tomorrow at noon so we can lock in the sprint schedule.\n\n"
                    "Best regards,\n"
                    "Quang Huy"
                ),
                warmups=[
                    w("choose", "What is the strategic advantage of offering 'Option A (Phased Release)' vs. 'Option B (Adjusted Date)'?", ["It turns a conflict into a collaborative choice while protecting quality standards.", "It forces the client to do the engineering work themselves.", "It hides the fact that the new feature takes extra time."], "It turns a conflict into a collaborative choice while protecting quality standards.", "Presenting structured options empowers the stakeholder while keeping expectations realistic."),
                    w("gap-fill", "Complete the preposition + gerund phrase: 'We want to meet your goal without ___ platform stability.'", ["compromising", "compromise", "compromised"], "compromising", "After the preposition 'without', always use the '-ing' gerund form."),
                    w("fix-the-error", "Fix the verb pattern after 'risk': 'Rushing both tasks would risk to introduce bugs.'", ["Rushing both tasks would risk introducing bugs.", "Rushing both tasks would risk to introduce bugs.", "Rushing both tasks would risk introduce bugs."], "Rushing both tasks would risk introducing bugs.", "The verb 'risk' is followed by a gerund ('risk introducing'), never an infinitive."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph email (180-300 words) responding to a client, professor, or manager who just requested a major last-minute addition to your project right before the deadline. Validate the value of their idea, explain the resource constraint objectively, and offer two structured options (phased delivery vs. extended deadline).",
                scaffold="checklist",
                frames=[],
                word_bank=["stakeholder", "allocated", "simultaneously", "risk", "without compromising", "Option A", "Option B", "rollout"],
                checklist=[
                    "Acknowledge the request positively before explaining the schedule or resource constraint",
                    "Explain clearly why doing everything at once would risk quality",
                    "Present two concrete options (scope phasing vs. timeline adjustment) and ask for a decision (180-300 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="B2",
        order=2,
        unit_id="balanced-argument",
        title="Multi-paragraph balanced arguments and concessions",
        theme="Structuring analytical essays on technology, work, and urban policy",
        outcome="Write cohesive 180 to 300 word multi-paragraph arguments with thesis statements, steel-manned concessions, and logical refutations.",
        grammar_focus=["paragraphing", "cohesion", "connectors", "relative-clauses"],
        vocabulary=["proponents", "contend", "nevertheless", "overlook", "sustainable", "mandate", "autonomy", "productivity"],
        lessons=[
            make_lesson(
                level="B2",
                lesson_id="balanced-argument-1",
                title="Writing a thesis-led introduction and steel-manning the opposing view",
                markdown=(
                    "### The Concession-First Essay Structure\n"
                    "In B2 analytical writing, placing the opposing argument in **Body Paragraph 1** (and treating it fairly—known as *steel-manning*) "
                    "makes your rebuttal in **Body Paragraph 2** far more persuasive.\n\n"
                    "- **Intro**: Hook context + specific controversy + **Qualified Thesis** (`While X offers..., Y ultimately provides...`).\n"
                    "- **Concession Body**: `Admittedly, proponents of X point out that...`"
                ),
                model_text=(
                    "As major cities struggle with worsening traffic congestion and air pollution, municipal leaders frequently debate whether to ban private motorbikes from downtown districts or invest heavily in suburban metro lines first. "
                    "While restricting private vehicles appears to offer an immediate reduction in street noise and emissions, expanding affordable public transit must come first so working residents are not unfairly penalized.\n\n"
                    "Admittedly, supporters of immediate downtown vehicle bans highlight several compelling environmental and safety benefits. "
                    "In densely populated commercial hubs, thousands of daily commuters on two-wheelers compete for narrow lanes, creating high accident rates and hazardous particulate levels during rush hour. "
                    "Cities that have pedestrianized historic quarters often see a rapid boost in street-level retail and tourism.\n\n"
                    "Nevertheless, enforcing a ban before reliable transit alternatives exist overlooks the daily reality of middle- and low-income workers. "
                    "Unlike office executives who can work remotely or afford taxis, service staff, nurses, and delivery couriers depend on affordable motorbikes to travel across outer districts that currently lack frequent bus routes. "
                    "Until high-capacity rail and feeder buses connect those neighborhoods within a thirty-minute commute, phasing in low-emission zones alongside transit expansion remains the only equitable solution."
                ),
                warmups=[
                    w("choose", "What makes a 'qualified thesis statement' stronger than a simple 'I agree' sentence?", ["It names both the concession and your core argument in a single complex sentence.", "It hides your real opinion until the last word of the essay.", "It uses first-person slang to sound casual."], "It names both the concession and your core argument in a single complex sentence.", "A 'While [concession], [main claim]' thesis gives the reader a complete roadmap."),
                    w("gap-fill", "Select the transition that pivots from a concession paragraph to your rebuttal paragraph: '___, enforcing a ban before transit exists overlooks working families.'", ["Nevertheless", "Similarly", "For instance"], "Nevertheless", "Use 'Nevertheless,' or 'However,' at the start of the rebuttal paragraph to pivot sharply."),
                    w("fix-the-error", "Fix the verb agreement in the relative clause: 'Workers who depends on motorbikes would face longer commutes.'", ["Workers who depend on motorbikes would face longer commutes.", "Workers who depends on motorbikes would face longer commutes.", "Workers which depend on motorbikes would face longer commutes."], "Workers who depend on motorbikes would face longer commutes.", "The verb inside a relative clause ('depend') agrees with the plural antecedent ('Workers')."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph analytical argument (180-300 words) on whether cities should restrict private vehicles in city centers or invest in public transport first (or a similar urban/workplace policy). Include a 'While..., ...' thesis in paragraph 1, a fair concession in paragraph 2, and your rebuttal in paragraph 3.",
                scaffold="outline",
                frames=[],
                word_bank=["congestion", "While", "Admittedly", "proponents", "compelling", "Nevertheless", "overlooks", "equitable"],
                checklist=[
                    "End your introduction with a complex thesis statement using 'While' or 'Although'",
                    "Develop the opposing view fairly in paragraph two starting with 'Admittedly,'",
                    "Pivot with 'Nevertheless,' or 'However,' in paragraph three to defend your position (180-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="balanced-argument-2",
                title="Cohesion through lexical chains and demonstrative reference",
                markdown=(
                    "### Replacing Mechanical Linkers (`First, Second, Moreover`) with `This + Summary Noun`\n"
                    "Overusing *Moreover*, *Furthermore*, and *Besides* at the start of every sentence makes B2 writing feel formulaic. "
                    "Instead, stitch sentences together by pointing back to the previous idea with **`This / These + summary noun`** "
                    "(*This shift*, *These constraints*, *Such pressures*)."
                ),
                model_text=(
                    "Many universities are reconsidering whether traditional three-hour closed-book exams accurately measure a graduate's readiness for modern professional work. "
                    "Although timed written tests remain convenient for grading large cohorts efficiently, replacing at least half of final course marks with collaborative project assessments better reflects real-world problem solving.\n\n"
                    "Defenders of conventional examination halls emphasize that proctored tests guarantee individual accountability, particularly in an era when generative AI tools can draft essays in seconds. "
                    "This safeguard ensures that every student masters core foundational terminology before advancing to senior seminars. "
                    "For disciplines such as pharmacology or structural engineering, rapid recall of safety formulas under pressure is undeniably important.\n\n"
                    "However, relying solely on memorized recall rewards short-term cramming rather than deep analytical transfer. "
                    "When graduates enter software teams, hospital clinics, or consulting firms, they rarely work in silent isolation without reference documentation. "
                    "Instead, employers expect them to synthesize incomplete data, defend their methodology in live code or design reviews, and iterate based on peer critique. "
                    "Combining practical portfolio defenses with targeted oral questioning preserves academic integrity while cultivating the exact collaborative and analytical skills that modern engineering, medical, and consulting workplaces demand from day one."
                ),
                warmups=[
                    w("gap-fill", "Link back to the previous sentence using a summary noun: 'Proctored tests guarantee individual accountability. ___ ensures that every student masters core concepts.'", ["This safeguard", "Moreover", "It thing"], "This safeguard", "'This + summary noun' ('This safeguard') creates tight cohesion without mechanical linkers."),
                    w("choose", "Why do advanced writers prefer 'This shift' or 'These findings' over bare 'It' or 'This' at the start of a sentence?", ["A summary noun clarifies exactly which aspect of the previous sentence you are referring to.", "It adds random words to make the sentence longer.", "It avoids using verbs in the sentence."], "A summary noun clarifies exactly which aspect of the previous sentence you are referring to.", "Unattended 'This' can be ambiguous; 'This + noun' is crystal clear."),
                    w("fix-the-error", "Fix the parallel structure after 'expect them to': 'Employers expect graduates to synthesize data, defend their methods, and iterating on feedback.'", ["Employers expect graduates to synthesize data, defend their methods, and iterate on feedback.", "Employers expect graduates to synthesize data, defending their methods, and iterate on feedback.", "Employers expect graduates synthesizing data, defend their methods, and iterate on feedback."], "Employers expect graduates to synthesize data, defend their methods, and iterate on feedback.", "Keep all items in a coordinated list in the same grammatical form ('synthesize, defend, and iterate')."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph analytical essay (180-300 words) discussing whether university courses should be graded mainly through timed exams or practical projects. Use at least two 'This/These + summary noun' phrases to connect sentences smoothly without overusing 'Moreover' or 'Furthermore'.",
                scaffold="outline",
                frames=[],
                word_bank=["accountability", "This safeguard", "undeniably", "relying solely on", "synthesize", "methodology", "iterate", "cultivating"],
                checklist=[
                    "Organize your essay into three clear paragraphs (Intro + Concession + Rebuttal/Synthesis)",
                    "Use at least two 'This/These + summary noun' phrases for sentence-to-sentence cohesion",
                    "Maintain parallel verb forms in lists and comparisons (180-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="balanced-argument-3",
                title="Evaluating four-day workweeks and productivity trade-offs",
                markdown=(
                    "### Unit 14 Checkpoint: Full B2 Balanced Argument Essay\n"
                    "Write a complete 3-paragraph evaluation weighing both sides of a workplace policy, integrating a complex thesis, "
                    "a fair concession paragraph, a rebuttal grounded in industry differences, and `This/These + noun` cohesion."
                ),
                model_text=(
                    "Recent international trials of the four-day, thirty-two-hour workweek have sparked intense debate among executives and human-resources leaders. "
                    "While compressing the workweek without reducing pay can boost focus and employee retention in knowledge-based roles, a rigid company-wide mandate is only sustainable if organizations first redesign how they run meetings and measure output.\n\n"
                    "Supporters of the four-day schedule point to pilot studies where software and marketing agencies maintained or even exceeded their quarterly revenue targets after dropping Fridays. "
                    "When workers know they have a three-day weekend ahead, they naturally cut out unnecessary status calls and prolonged coffee breaks. "
                    "This heightened efficiency also lowers burnout and significantly reduces costly staff turnover.\n\n"
                    "On the other hand, applying a uniform four-day rule across customer-facing or shift-based departments creates immediate scheduling pressures. "
                    "In healthcare clinics, logistics hubs, and live technical support teams, value is tied directly to continuous coverage rather than solo deep-work blocks. "
                    "If a company shortens hours without hiring additional staff or automating routine inquiries, remaining employees simply face four ten-hour days of high-stress multitasking. "
                    "Ultimately, flexible output-based schedules succeed when teams audit and eliminate low-value tasks before cutting hours."
                ),
                warmups=[
                    w("gap-fill", "Complete the conditional requirement: 'A shorter workweek is only sustainable ___ companies first cut low-value meetings.'", ["if", "unless", "despite"], "if", "'only ... if' expresses a necessary condition for success."),
                    w("fix-the-error", "Fix the preposition + gerund structure: 'Compressing the week without reduce pay boosts morale.'", ["Compressing the week without reducing pay boosts morale.", "Compressing the week without reduce pay boosts morale.", "Compressing the week without to reduce pay boosts morale."], "Compressing the week without reducing pay boosts morale.", "Use the '-ing' gerund ('reducing') after the preposition 'without'."),
                    w("choose", "How does the model conclusion resolve the tension between paragraphs 2 and 3?", ["Instead of a simplistic yes/no, it specifies the exact condition under which the policy works.", "It contradicts the thesis statement completely.", "It repeats the introduction word for word."], "Instead of a simplistic yes/no, it specifies the exact condition under which the policy works.", "Nuanced B2 conclusions specify *when* and *how* a policy succeeds."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph balanced argument (180-300 words) evaluating whether companies should adopt a four-day workweek (or a mandatory return-to-office policy). Include a qualified thesis, examine where the policy works well vs. where it struggles, and close with a nuanced conclusion.",
                scaffold="checklist",
                frames=[],
                word_bank=["compressing", "sustainable", "retention", "This heightened efficiency", "turnover", "continuous", "multitasking", "ultimately"],
                checklist=[
                    "Write three balanced paragraphs totaling 180 to 300 words",
                    "Include a qualified thesis statement and at least one 'This/These + summary noun' link",
                    "End with a nuanced conclusion that specifies the conditions for success",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="B2",
        order=3,
        unit_id="evidence-of-fit",
        title="Demonstrating evidence of fit in applications and cover letters",
        theme="Connecting past achievements to role or program requirements using the STAR method",
        outcome="Write compelling 180 to 300 word cover letters and fit statements that prove capabilities through concrete STAR narratives rather than adjective lists.",
        grammar_focus=["verb-tense", "word-choice", "collocation", "register"],
        vocabulary=["spearhead", "streamline", "collaborate", "quantifiable", "align", "track record", "initiative", "contribute"],
        lessons=[
            make_lesson(
                level="B2",
                lesson_id="evidence-of-fit-1",
                title="Turning resume bullets into a STAR achievement paragraph",
                markdown=(
                    "### Show, Don't Tell: The Compact STAR Paragraph\n"
                    "Hiring managers skim past generic self-praise (*I am a hard-working team player with great communication skills*). "
                    "Prove your skill with a compact **STAR** narrative:\n\n"
                    "- **Situation & Task**: What specific challenge or goal did your team face?\n"
                    "- **Action**: What precise steps did *you* take using strong active verbs (*redesigned*, *automated*, *negotiated*)?\n"
                    "- **Result**: What measurable improvement followed?"
                ),
                model_text=(
                    "During my past two years as an operations analyst at a regional e-commerce distributor, I have focused on turning fragmented warehouse data into practical process improvements. "
                    "When I joined the fulfillment team last spring, weekly inventory reconciliation across our three city depots required six hours of manual spreadsheet copying every Monday morning, which frequently delayed dispatch schedules.\n\n"
                    "To resolve this bottleneck, I collaborated with two warehouse supervisors to map their stock-counting workflow and built an automated SQL and Python validation script that flagged quantity mismatches in real time. "
                    "I also wrote a two-page visual guide and ran a thirty-minute training session so shift leads could troubleshoot scan errors independently.\n\n"
                    "Within six weeks of launching the new workflow, Monday reporting time dropped from six hours to under forty minutes, and monthly stock discrepancies fell by thirty-five percent. "
                    "Furthermore, the validation dashboard now serves as our standard onboarding template whenever the company opens a new regional micro-fulfillment center. This experience taught me how to pair technical automation with empathetic frontline communication—an operational discipline I am eager to bring to the Senior Supply Chain Analyst role at your company."
                ),
                warmups=[
                    w("choose", "Which sentence demonstrates 'evidence of fit' instead of empty self-praise?", ["By redesigning our onboarding checklist, I cut setup time from three days to four hours.", "I am an extremely passionate, hard-working, and dynamic person who loves efficiency.", "My resume shows that I have worked at several companies in the past."], "By redesigning our onboarding checklist, I cut setup time from three days to four hours.", "Concrete actions paired with before-and-after metrics prove competence immediately."),
                    w("gap-fill", "Select the strong active verb: 'I ___ with two warehouse supervisors to map their workflow.'", ["collaborated", "did", "made"], "collaborated", "'Collaborated with' is much more precise than vague verbs like 'did' or 'made'."),
                    w("fix-the-error", "Fix the tense shift in the completed past narrative: 'Within six weeks, reporting time drops to forty minutes and errors fall by a third.'", ["Within six weeks, reporting time dropped to forty minutes and errors fell by a third.", "Within six weeks, reporting time drops to forty minutes and errors fell by a third.", "Within six weeks, reporting time has drop to forty minutes."], "Within six weeks, reporting time dropped to forty minutes and errors fell by a third.", "Keep completed past project results in the past simple ('dropped', 'fell')."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph evidence-of-fit statement (180-300 words) for a job or internship application. Use the STAR structure (Situation/Task, Action, and quantifiable Result) to prove one core strength through a real or realistic project story, and link that lesson to the target role.",
                scaffold="outline",
                frames=[],
                word_bank=["fragmented", "bottleneck", "collaborated", "automated", "troubleshoot", "within", "discrepancies", "eager to bring"],
                checklist=[
                    "Set the context and specific problem in the opening paragraph",
                    "Describe your concrete actions using strong active past-tense verbs in paragraph two",
                    "State the measurable result and connect the takeaway to the target role in paragraph three (180-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="evidence-of-fit-2",
                title="Aligning your experience with a specific company or organization",
                markdown=(
                    "### Tailoring the 'Why You + Why Us' Bridge\n"
                    "Generic cover letters fail because they could be sent to fifty companies without changing a word. "
                    "Build an explicit bridge between **one specific initiative the target organization is pursuing** and **your proven experience solving a parallel problem**."
                ),
                model_text=(
                    "Dear Hiring Team,\n\n"
                    "I was excited to read your engineering blog post last month detailing how your platform is expanding localized payment and invoicing tools for small merchants across Southeast Asia. "
                    "Having spent the past three years building bilingual merchant dashboards and tax-reporting workflows for small retailers in Vietnam, I am writing to apply for the Product Manager position on your Merchant Growth squad.\n\n"
                    "In my current role at a fintech startup in Ho Chi Minh City, I led the rollout of a simplified mobile invoicing feature for over four thousand independent shop owners. "
                    "Early user interviews revealed that sixty percent of first-time sellers abandoned the setup screen because the accounting terminology felt overwhelming. "
                    "Working closely with our UX writer and backend lead, I replaced the multi-page tax form with a three-step visual wizard that pre-filled business category codes automatically. "
                    "Following the release, seven-day merchant activation rose from thirty-eight percent to sixty-four percent.\n\n"
                    "Because your team is now tackling similar onboarding challenges for micro-enterprises in regional markets, I would welcome the opportunity to share how these localization insights can support your Q1 roadmap.\n\n"
                    "Sincerely,\n"
                    "Thao Nguyen"
                ),
                warmups=[
                    w("gap-fill", "Complete the perfect participle opening: '___ spent three years building merchant tools, I understand the challenges small retailers face.'", ["Having", "Have", "Had"], "Having", "'Having + past participle' ('Having spent...') compactly links multi-year experience to your current pitch."),
                    w("choose", "What makes the opening paragraph of the model letter stand out to a hiring manager?", ["It links a specific project from the company's blog directly to the applicant's background.", "It flatters the company with generic praise like 'You are the most famous company in the world.'", "It lists every school the applicant attended since childhood."], "It links a specific project from the company's blog directly to the applicant's background.", "Naming a specific company project proves genuine research and immediate relevance."),
                    w("fix-the-error", "Fix the preposition after 'apply': 'I am writing to apply the Product Manager position.'", ["I am writing to apply for the Product Manager position.", "I am writing to apply the Product Manager position.", "I am writing to apply to the Product Manager position."], "I am writing to apply for the Product Manager position.", "We 'apply for a role/position' and 'apply to a company/university'."),
                ],
                genre="formal correspondence",
                prompt="Write a tailored 3-paragraph cover letter (180-300 words) applying for a specific role at a company or organization. Reference one specific project or goal of the organization in paragraph 1, prove your relevant capability with a concrete project story in paragraph 2, and close with a confident call to discussion.",
                scaffold="outline",
                frames=[],
                word_bank=["Having spent", "apply for", "rollout", "revealed", "working closely with", "activation", "tackling", "welcome the opportunity"],
                checklist=[
                    "Open by connecting a specific company initiative to your background using 'Having + past participle'",
                    "Include a concrete project story with a measurable outcome in the body paragraph",
                    "Use 'apply for [role]' accurately and close professionally (180-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="evidence-of-fit-3",
                title="Addressing a career pivot or skill gap as a transferable strength",
                markdown=(
                    "### Unit 15 Checkpoint: Turning a Non-Linear Background into an Advantage\n"
                    "When transitioning between fields (e.g., from teaching to instructional design, or hospitality to customer success), "
                    "never apologize for what you lack (*Although I have no experience...*). Instead, reframe your prior domain as a **rare complementary strength** backed by concrete evidence."
                ),
                model_text=(
                    "Dear Ms. Mai,\n\n"
                    "When EdTech product teams build language-learning software, the widest gap often lies between engineering specifications and how hesitant beginners actually behave in a classroom. "
                    "After five years of teaching adult English learners in Hanoi and two years of designing self-paced digital curricula, I am applying for the Learning Experience Designer role at your studio to bridge that exact gap.\n\n"
                    "During my time leading curriculum development at a private language center, I noticed that forty percent of A1 students dropped out between Unit 2 and Unit 3 because the online homework jumped abruptly from multiple-choice quizzes to full paragraphs. "
                    "Drawing on my classroom notes, I redesigned the module sequence to introduce guided sentence frames and automated mistake-review cards before every checkpoint task. "
                    "I also partnered with our two web developers to write clear JSON content schemas and test every exercise on mobile screens. "
                    "Over the next two terms, course completion across six hundred learners climbed from fifty-eight percent to eighty-one percent.\n\n"
                    "Combining frontline classroom empathy with structured content-schema design allows me to contribute immediately to your upcoming course expansion. "
                    "Thank you for considering my application, and I look forward to discussing how we can raise learner retention together.\n\n"
                    "Best regards,\n"
                    "Minh Chau"
                ),
                warmups=[
                    w("choose", "How should you frame a career transition in a B2 cover letter?", ["Show how combining your frontline domain with your new technical skill solves a team blind spot.", "Apologize repeatedly for not having ten years of identical job titles.", "Hide your previous job completely so nobody asks about it."], "Show how combining your frontline domain with your new technical skill solves a team blind spot.", "Positioning your dual background as a bridge between two worlds turns a pivot into an asset."),
                    w("gap-fill", "Complete the participle phrase: '___ on my classroom notes, I redesigned the module sequence.'", ["Drawing", "Drawn", "To draw"], "Drawing", "'Drawing on [source/experience], I...' is an idiomatic B2/C1 opener when applying past knowledge."),
                    w("fix-the-error", "Fix the verb form after 'look forward to': 'I look forward to discuss my application with you.'", ["I look forward to discussing my application with you.", "I look forward to discuss my application with you.", "I look forward discussing my application with you."], "I look forward to discussing my application with you.", "In 'look forward to', 'to' is a preposition, so it must be followed by a gerund ('discussing')."),
                ],
                genre="formal correspondence",
                prompt="Write a 3-paragraph application letter (180-300 words) pitching yourself for a role or program where you combine two different strengths or transition from one field to another. Show how your combined background solves a real problem, back it up with a quantified achievement story, and close with 'I look forward to + verb-ing'.",
                scaffold="checklist",
                frames=[],
                word_bank=["bridge", "abruptly", "Drawing on", "redesigned", "partnered with", "completion", "empathy", "look forward to"],
                checklist=[
                    "Frame your dual background or career pivot as a distinct advantage in paragraph one",
                    "Include a STAR achievement story with specific metrics in paragraph two",
                    "End with 'I look forward to + verb-ing' and keep length between 180 and 300 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
])


# ============================================================================
# PART 3: ZERO-TO-HERO CORE PATH (C1 & C2 — Units 16 to 21)
# ============================================================================

CORE_UNITS.extend([
    # --- C1 (250 to 400 words) ---
    make_unit(
        level="C1",
        order=1,
        unit_id="motivation-and-evidence",
        title="Academic and fellowship motivation with intellectual evidence",
        theme="Articulating research or leadership motivation grounded in prior inquiry",
        outcome="Write sophisticated 250 to 400 word statements of purpose that anchor future intellectual goals in concrete empirical or professional work.",
        grammar_focus=["register", "cohesion", "collocation", "relative-clauses"],
        vocabulary=["catalyst", "empirical", "discrepancy", "underpin", "trajectory", "rigorous", "interdisciplinary", "address"],
        lessons=[
            make_lesson(
                level="C1",
                lesson_id="motivation-and-evidence-1",
                title="Opening with an intellectual problem rather than a childhood cliché",
                markdown=(
                    "### Replacing Biographical Clichés with an Intellectual Catalyst\n"
                    "Admissions and fellowship committees read thousands of openings that begin *Since I was a child, I have always been fascinated by...* "
                    "At C1, open your statement of purpose by defining a **concrete tension, anomaly, or unsolved problem** you encountered in your field, "
                    "and position your past work as the foundation for investigating it further."
                ),
                model_text=(
                    "When coastal municipalities in central Vietnam invest in flood-warning sensors, engineering reports typically measure success by hardware uptime and signal coverage. "
                    "Yet during the October 2024 typhoon season, I observed a troubling discrepancy while volunteering with a provincial disaster-response mapping team in Quang Nam: three riverside communes with fully operational water-level sensors still experienced severe evacuation delays. "
                    "Post-storm interviews with ward coordinators revealed that automated SMS alerts were phrased in technical hydrological terminology that elderly residents and fishing households could not easily interpret as actionable evacuation triggers.\n\n"
                    "Investigating that gap between technical infrastructure and community risk comprehension has shaped my professional trajectory over the past two years. "
                    "As a research assistant at the Urban Resilience Lab in Da Nang, I co-designed a field study across four hundred households to test how localized visual flood markers—referencing familiar neighbourhood landmarks rather than abstract meter readings—affected evacuation timing. "
                    "By pairing geospatial elevation data with household survey responses in R, I demonstrated that landmark-anchored alerts increased early self-evacuation intent by forty-two percent among residents over sixty. "
                    "Our findings were subsequently adopted by two district civil-defense offices for their seasonal preparedness drills.\n\n"
                    "While this field experiment confirmed the value of human-centered alert design at the commune scale, scaling such systems across diverse river basins requires deeper training in spatial econometrics and behavioral public policy. "
                    "Pursuing the Master of Public Policy in Climate Adaptation will equip me with the advanced spatial-econometric and behavioral evaluation tools needed to design national early-warning frameworks that are both technically rigorous and immediately intelligible to vulnerable coastal communities."
                ),
                warmups=[
                    w("choose", "Why does opening with a specific field anomaly outperform a 'Since childhood' opening in a C1 statement of purpose?", ["It immediately establishes domain maturity, analytical curiosity, and a clear problem space.", "It hides the applicant's academic background from the committee.", "It uses dramatic fiction instead of real experience."], "It immediately establishes domain maturity, analytical curiosity, and a clear problem space.", "Committees look for applicants who think like practitioners and researchers from sentence one."),
                    w("gap-fill", "Select the precise C1 noun for an unexpected gap between theory and reality: 'Field observations revealed a troubling ___ between sensor uptime and actual evacuation speed.'", ["discrepancy", "harmony", "duplication"], "discrepancy", "'A discrepancy between X and Y' precisely names an unexpected mismatch."),
                    w("fix-the-error", "Fix the gerund subject agreement: 'Investigating the gap between hardware and human behavior have shaped my research goals.'", ["Investigating the gap between hardware and human behavior has shaped my research goals.", "Investigating the gap between hardware and human behavior have shaped my research goals.", "Investigate the gap between hardware and human behavior has shaped my research goals."], "Investigating the gap between hardware and human behavior has shaped my research goals.", "The singular gerund phrase 'Investigating the gap...' requires the singular verb 'has shaped'."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph motivation statement (250-400 words) for a graduate program, fellowship, or senior specialist role. Open with a specific problem or discrepancy you observed in your field, detail a project or study where you investigated it with measurable results, and explain what advanced capability you now seek.",
                scaffold="outline",
                frames=[],
                word_bank=["discrepancy", "revealed", "actionable", "trajectory", "demonstrated", "subsequently", "scaling", "rigorous"],
                checklist=[
                    "Open with a concrete domain problem or discrepancy rather than a childhood cliché",
                    "Support your motivation with a detailed project or research example in paragraph two",
                    "Clearly articulate the analytical or technical gap that the target program will fill (250-400 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="motivation-and-evidence-2",
                title="Using nominalization to pack dense evidence into crisp prose",
                markdown=(
                    "### Academic Nominalization: Turning Verb Chains into Precise Noun Phrases\n"
                    "C1 academic and executive prose achieves density by converting sprawling verb-heavy clauses into compact **nominalized subjects or objects**—while keeping a strong active main verb.\n\n"
                    "- **Wordy B1/B2**: *When clinics depended on paper records, doctors took longer to check how drugs interacted.*\n"
                    "- **Nominalized C1**: *Reliance on paper records prolonged the verification of drug interactions across rural clinics.*"
                ),
                model_text=(
                    "Rapid adoption of electronic health records across provincial hospitals in Vietnam has digitized billing workflows, yet clinical data fragmentation continues to impede continuity of care for chronic-disease patients. "
                    "During my eighteen-month tenure as a health-informatics analyst at a regional hospital network in Can Tho, I observed how incompatible laboratory schemas forced physicians to order duplicate diagnostic blood panels whenever diabetic patients transferred between outpatient clinics.\n\n"
                    "To quantify the financial and clinical cost of this redundancy, I audited twelve thousand anonymized outpatient encounters from the preceding fiscal year and mapped the schema mismatches between our three laboratory vendors. "
                    "My analysis revealed that nearly nineteen percent of repeat HbA1c and lipid tests stemmed not from clinical necessity, but from the absence of a standardized patient-identifier bridge across departmental databases. "
                    "Presenting these findings to the hospital's medical executive committee secured approval for a lightweight HL7 FHIR interoperability layer, which I helped specify and validate over a four-month deployment cycle. "
                    "Implementation of this cross-clinic data bridge reduced duplicate laboratory orders by twenty-eight percent in its first two quarters and shortened average outpatient consultation wait times by eleven minutes.\n\n"
                    "Despite this localized success, manual schema reconciliation remains unsustainable as regional networks integrate wearable monitoring streams and imaging archives. "
                    "Moreover, establishing automated audit trails across participating clinics enabled senior endocrinologists to track regional medication adherence trends without exposing patient identities. Through the MSc in Biomedical Data Science, I aim to master probabilistic record-linkage algorithms and privacy-preserving federated learning so that resource-constrained hospital networks across Southeast Asia can unify longitudinal patient histories safely and cost-effectively."
                ),
                warmups=[
                    w("choose", "Which revision best demonstrates C1 nominalization without slipping into passive vagueness?", ["Implementation of the cross-clinic data bridge reduced duplicate lab orders by 28%.", "When we put in the bridge connecting the clinics, it made duplicate lab orders go down by 28%.", "The orders were reduced when things were implemented in the hospital."], "Implementation of the cross-clinic data bridge reduced duplicate lab orders by 28%.", "Nominalizing the action ('Implementation of...') into the subject lets you pair it with a crisp verb ('reduced')."),
                    w("gap-fill", "Complete the parallel causal structure: 'Repeat tests stemmed not from clinical necessity, ___ from the absence of a standardized identifier.'", ["but", "and", "or"], "but", "The correlative pattern 'not from X, but from Y' creates sharp analytical contrast."),
                    w("fix-the-error", "Fix the preposition in the nominalized phrase: 'Reliance in manual spreadsheets delayed the audit.'", ["Reliance on manual spreadsheets delayed the audit.", "Reliance in manual spreadsheets delayed the audit.", "Reliance at manual spreadsheets delayed the audit."], "Reliance on manual spreadsheets delayed the audit.", "The noun 'reliance' (like the verb 'rely') always takes the preposition 'on'."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph statement of purpose or technical case narrative (250-400 words) using C1 nominalization (such as 'Implementation of...', 'Reliance on...', or 'The absence of...') and a 'not from X, but from Y' contrast to present your past analytical work and future goals.",
                scaffold="outline",
                frames=[],
                word_bank=["adoption", "fragmentation", "impede", "redundancy", "stemmed not from", "absence of", "implementation", "unsustainable"],
                checklist=[
                    "Use at least two nominalized noun phrases as clause subjects",
                    "Include a 'not from X, but from Y' (or 'not X, but Y') contrast sentence",
                    "Maintain a total length of 250 to 400 words across three cohesive paragraphs",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="motivation-and-evidence-3",
                title="Connecting past methodology to a concrete future research or leadership agenda",
                markdown=(
                    "### Unit 16 Checkpoint: Complete C1 Motivation & Evidence Statement\n"
                    "Synthesize an intellectual catalyst, a rigorously quantified past investigation, and a concrete forward-looking research or leadership agenda."
                ),
                model_text=(
                    "As manufacturing supply chains in Southeast Asia face stricter international carbon-border reporting rules, small and medium-sized textile suppliers risk losing export contracts not because their factories are uniquely polluting, but because they lack verifiable scope-two and scope-three emissions accounting. "
                    "While advising twelve garment manufacturers in Binh Duong during an industrial energy-efficiency audit last year, I saw firsthand how spreadsheet-based utility tracking broke down whenever factories shared steam boilers across multiple production lines.\n\n"
                    "To address this attribution bottleneck, I led the development of a sub-metering allocation model that combined hourly smart-meter readings with batch dye-house production logs. "
                    "Rather than relying on annual facility-wide averages—which penalized low-temperature cotton runs—our model assigned steam and electricity intensity at the individual purchase-order level. "
                    "Across an eight-month pilot with four mid-sized mills, granular batch tracking uncovered nocturnal steam-valve leaks that accounted for fourteen percent of baseline fuel consumption. "
                    "Repairing those leaks and certifying batch-level emissions enabled all four suppliers to pass European buyer audits while saving an average of $18,000 annually in natural-gas costs.\n\n"
                    "However, extending order-level carbon accounting to upstream raw-material dye suppliers remains constrained by inconsistent sensor calibration and supplier reluctance to disclose proprietary yield data. "
                    "We also published an open-source allocation template in collaboration with the provincial textile association so smaller family-owned dyehouses could replicate the audit methodology without hiring external consultants. In the Industrial Sustainability Fellowship, I plan to investigate how zero-knowledge verification protocols and low-cost IoT telemetry can allow multi-tier manufacturing clusters to verify scope-three emissions compliance without exposing sensitive commercial margins."
                ),
                warmups=[
                    w("gap-fill", "Complete the non-defining relative clause inside parenthetical dashes: 'Rather than relying on annual averages—___ penalized efficient runs—our model tracked individual batches.'", ["which", "that", "who"], "which", "Use 'which' (never 'that') in non-defining clauses set off by commas or dashes."),
                    w("choose", "What makes the final paragraph of the model statement persuasive at C1 level?", ["It names the exact limitation of the past project and proposes a specific inquiry to solve it.", "It says 'I hope to learn many interesting things from your famous professors.'", "It repeats the biography from paragraph one."], "It names the exact limitation of the past project and proposes a specific inquiry to solve it.", "Showing where your previous work hit a boundary proves you are ready for advanced study."),
                    w("fix-the-error", "Fix the verb pattern after 'enabled': 'Batch-level tracking enabled all four suppliers passing European audits.'", ["Batch-level tracking enabled all four suppliers to pass European audits.", "Batch-level tracking enabled all four suppliers passing European audits.", "Batch-level tracking enabled all four suppliers pass European audits."], "Batch-level tracking enabled all four suppliers to pass European audits.", "Use 'enable + object + to-infinitive' ('enabled suppliers to pass')."),
                ],
                genre="application letter",
                prompt="Write a complete 3-paragraph C1 motivation statement (250-400 words) for a fellowship, graduate degree, or leadership track. Anchor your opening in an industry or research problem, detail a rigorous project with concrete methodology and outcomes, and define the specific next-stage question you intend to solve.",
                scaffold="none",
                frames=[],
                word_bank=["not because", "attribution", "granular", "accounted for", "enabled", "constrained by", "proprietary", "compliance"],
                checklist=[
                    "Open with a sharp industry or research tension using a 'not because..., but because...' or contrast structure",
                    "Detail your methodology and measurable outcomes in paragraph two",
                    "Define a specific, credible next-stage research or leadership question in paragraph three (250-400 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="C1",
        order=2,
        unit_id="verified-programme-fit",
        title="Demonstrating verified programme and institutional fit",
        theme="Mapping research labs, curricula, and organizational strategy to your agenda",
        outcome="Write highly targeted 250 to 400 word institutional fit sections that link specific courses, faculty labs, or strategic initiatives to your methodology.",
        grammar_focus=["cohesion", "collocation", "register", "relative-clauses"],
        vocabulary=["complement", "synergy", "methodology", "curriculum", "faculty", "seminar", "equip", "contribute"],
        lessons=[
            make_lesson(
                level="C1",
                lesson_id="verified-programme-fit-1",
                title="Linking specific courses and faculty research to your project",
                markdown=(
                    "### Verified Fit vs. Website Name-Dropping\n"
                    "Merely listing course titles or professor names (*I want to take Course X with Professor Y because she is famous*) looks copied from a brochure. "
                    "**Verified fit** explains **how a specific method or framework from that course or lab directly advances a technical step in your proposed work**."
                ),
                model_text=(
                    "The interdisciplinary structure of the MSc in Urban Data Science provides the exact methodological training I need to evaluate transit equity across rapidly growing secondary cities. "
                    "While my past work at the Da Nang Transport Department relied on static household travel surveys collected every five years, modeling informal minibus and two-wheeler flows requires high-frequency mobility inference.\n\n"
                    "In particular, the core seminar on *Spatial Network Modeling* will allow me to replace static origin-destination matrices with dynamic graph neural networks capable of capturing peak-hour congestion spillovers. "
                    "Pairing this coursework with the elective in *Causal Inference for Public Policy* will address a recurring limitation in my municipal evaluations: distinguishing genuine ridership gains caused by new bus-rapid-transit lanes from seasonal tourism fluctuations through synthetic control methods.\n\n"
                    "Beyond classroom training, my research agenda aligns closely with the Urban Mobility Lab's ongoing project on multimodal accessibility in Southeast Asian port cities. "
                    "Having cleaned and geocoded three years of GPS transponder logs from four hundred municipal buses in central Vietnam, I can contribute a validated longitudinal dataset and local institutional context to the lab's comparative benchmarking work. "
                    "In my previous role, I also built an open-source GTFS-realtime parser that reconciles informal feeder-bus stops with official metro station entrances across three coastal provinces. Working alongside this research group will enable me to test how multimodal fare-integration subsidies affect low-income industrial-park commuters under varying weather and fuel-price scenarios, generating actionable, equity-focused policy briefs and open-source simulation benchmarks for municipal transport authorities across rapidly urbanizing Southeast Asian metropolitan corridors over the coming decade."
                ),
                warmups=[
                    w("choose", "What distinguishes 'verified programme fit' from superficial name-dropping?", ["Explaining the exact skill a course teaches and how it solves a gap in your own work.", "Copying five course codes in a row without explaining why you need them.", "Praising the university's architecture and world ranking."], "Explaining the exact skill a course teaches and how it solves a gap in your own work.", "Always connect a named seminar or lab to a specific methodological need."),
                    w("gap-fill", "Complete the reciprocal contribution sentence: 'Having geocoded three years of transit logs, I can ___ a validated dataset to the lab's comparative study.'", ["contribute", "borrow", "consume"], "contribute", "Strong C1 fit statements show a two-way street: what you learn and what you contribute."),
                    w("fix-the-error", "Fix the preposition after 'aligns': 'My research agenda aligns closely to the lab's ongoing project.'", ["My research agenda aligns closely with the lab's ongoing project.", "My research agenda aligns closely to the lab's ongoing project.", "My research agenda aligns closely at the lab's ongoing project."], "My research agenda aligns closely with the lab's ongoing project.", "Standard collocation: 'align with [something]'."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph institutional or programme fit statement (250-400 words) for a graduate degree, fellowship, or specialized team. Explain how two specific modules or initiatives solve methodological gaps in your past work, and state what concrete dataset, skill, or perspective you will contribute to the cohort.",
                scaffold="outline",
                frames=[],
                word_bank=["methodological", "in particular", "recurring limitation", "distinguishing", "aligns closely with", "Having", "contribute", "actionable"],
                checklist=[
                    "Connect at least two specific courses, modules, or team initiatives to concrete analytical needs",
                    "Use 'aligns closely with' and a 'Having + past participle' clause accurately",
                    "Specify what tangible value or experience you will contribute to the group (250-400 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="verified-programme-fit-2",
                title="Positioning peer-cohort contributions and cross-functional value",
                markdown=(
                    "### Articulating Peer-Learning & Cohort Value\n"
                    "Selective programs and leadership tracks evaluate how you will elevate the peers around you. "
                    "Frame your regional, technical, or operational background as a **case-study lens** that enriches seminar debates and collaborative capstones."
                ),
                model_text=(
                    "A defining strength of the Global Digital Governance Fellowship is its cohort model, which brings together software architects, legal scholars, and municipal regulators to co-author policy playbooks. "
                    "Because most published AI-governance frameworks originate in North American or European regulatory environments, practitioners from emerging digital economies must often adapt compliance rules to vastly different infrastructure realities.\n\n"
                    "Over the past four years leading data-privacy compliance for a Vietnamese telemedicine platform serving two million rural patients, I have navigated the practical tension between strict consent documentation and low-literacy mobile interfaces. "
                    "When our legal team initially drafted a twelve-screen privacy disclosure to comply with national personal-data protection decrees, rural onboarding completion dropped by half within forty-eight hours. "
                    "By convening joint workshops between our regulatory counsel, voice-UI engineers, and provincial clinic nurses, I helped pioneer a layered audio-visual consent workflow that satisfied statutory audit standards while restoring patient sign-up rates.\n\n"
                    "In the fellowship's working group on *Inclusive Digital Public Infrastructure*, I look forward to sharing these frontline implementation trade-offs alongside legal and policy peers from Latin America and Sub-Saharan Africa. "
                    "Our layered consent framework was subsequently cited by the Ministry of Health's digital working group as a reference model for rural telehealth providers nationwide. At the same time, collaborating with cohort members who specialize in algorithmic fairness auditing and comparative administrative law will sharpen my ability to design lightweight transparency protocols for AI-assisted diagnostic triage tools before returning to Vietnam to lead regional health-tech governance standards and cross-border clinical data interoperability initiatives across Southeast Asia."
                ),
                warmups=[
                    w("gap-fill", "Select the precise noun for balancing competing requirements: 'I navigated the practical ___ between strict legal disclosures and accessible mobile design.'", ["tension", "vacation", "similarity"], "tension", "'The tension between X and Y' is an idiomatic C1 framing for competing priorities."),
                    w("choose", "Why does contrasting emerging-market implementation with Western regulatory templates strengthen this cohort pitch?", ["It shows the applicant brings a distinct practitioner perspective to seminar discussions.", "It claims that legal rules do not matter in software engineering.", "It avoids mentioning any personal work experience."], "It shows the applicant brings a distinct practitioner perspective to seminar discussions.", "Showing how your context expands the cohort's perspective proves unique value."),
                    w("fix-the-error", "Fix the verb form after 'comply': 'We redesigned the workflow to comply the new data-protection decree.'", ["We redesigned the workflow to comply with the new data-protection decree.", "We redesigned the workflow to comply the new data-protection decree.", "We redesigned the workflow to comply for the new data-protection decree."], "We redesigned the workflow to comply with the new data-protection decree.", "The verb 'comply' always requires the preposition 'with' ('comply with a rule/standard')."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph cohort and institutional fit statement (250-400 words) explaining what unique regional, technical, or industry perspective you bring to a peer cohort, illustrated by a concrete cross-functional challenge you solved, and what you hope to learn from your peers.",
                scaffold="outline",
                frames=[],
                word_bank=["defining strength", "originate in", "tension between", "comply with", "convening", "frontline", "trade-offs", "at the same time"],
                checklist=[
                    "Identify why the cohort or cross-functional structure matters in paragraph one",
                    "Illustrate your perspective with a concrete story of resolving a tension between two priorities",
                    "Balance what you will share with peers and what you will learn from them (250-400 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="verified-programme-fit-3",
                title="Synthesizing post-programme impact and career trajectory",
                markdown=(
                    "### Unit 17 Checkpoint: Full Verified Programme Fit & Trajectory Essay\n"
                    "Bring together curriculum fit, research/project synergy, cohort contribution, and a credible 3-to-5-year post-programme impact plan."
                ),
                model_text=(
                    "Joining the Executive Master in Sustainable Supply Chain Management at this pivotal stage of my career will allow me to bridge frontline logistics operations with rigorous decarbonization strategy. "
                    "Having managed cold-chain agricultural distribution across the Mekong Delta for five years, I have seen how post-harvest spoilage and diesel-reliant river transport erode both farmer incomes and export competitiveness.\n\n"
                    "The programme's specialized track in *Cold-Chain Network Optimization* directly addresses the analytical bottlenecks I encountered while piloting solar-assisted cold storage hubs last year. "
                    "While my operations team successfully reduced warehouse cooling costs by twenty-two percent across three provincial depots, we lacked the stochastic routing models required to coordinate multi-temperature electric trucks across tidal ferry schedules. "
                    "Mastering mixed-integer linear programming in the *Green Logistics Analytics* module, alongside the Capstone Practicum with regional port authorities, will give me the exact modeling toolkit needed to solve multi-modal routing under climate uncertainty.\n\n"
                    "Equally important, I am eager to contribute field data and operational case studies from Southeast Asia's agricultural corridors to the cohort's supply-chain resilience debates. "
                    "Specifically, my field logs document seasonal voltage drops, ferry queue distributions, and post-harvest thermal loss across more than eight thousand smallholder fruit and aquaculture shipments. Upon graduation, I will return to lead our logistics network's regional green-corridor initiative, applying these stochastic optimization frameworks to coordinate solar-charged river barges and electric refrigerated trucks—cutting diesel cold-chain emissions and post-harvest agricultural spoilage by thirty percent across twelve provincial Mekong agricultural collection hubs within the first three years of completing this specialized executive master programme in Singapore."
                ),
                warmups=[
                    w("gap-fill", "Choose the C1 opening phrase that signals post-graduation plans: '___ graduation, I will return to lead our regional green-corridor initiative.'", ["Upon", "During", "Despite"], "Upon", "'Upon graduation,' or 'Upon completing the programme,' is crisp and formal."),
                    w("fix-the-error", "Fix the verb agreement with a compound subject: 'Post-harvest spoilage and inefficient river transport erodes farmer incomes.'", ["Post-harvest spoilage and inefficient river transport erode farmer incomes.", "Post-harvest spoilage and inefficient river transport erodes farmer incomes.", "Post-harvest spoilage and inefficient river transport eroding farmer incomes."], "Post-harvest spoilage and inefficient river transport erode farmer incomes.", "Two subjects joined by 'and' ('spoilage and transport') form a plural subject and take 'erode'."),
                    w("choose", "What makes a post-programme career plan believable to a scholarship or admissions panel?", ["Naming a specific role, a concrete problem to solve, and a measurable three-year target.", "Saying 'I want to become a billionaire CEO and save the whole planet.'", "Saying 'I have no idea what I will do after I graduate.'"], "Naming a specific role, a concrete problem to solve, and a measurable three-year target.", "Specificity in scope, timeframe, and target metrics proves strategic realism."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph C1 programme fit and career trajectory statement (250-400 words). Connect your operational background to two specific analytical modules in the target programme, explain your contribution to the peer cohort, and outline a concrete 3-year post-graduation impact plan.",
                scaffold="none",
                frames=[],
                word_bank=["pivotal", "erode", "directly addresses", "lacked", "Equally important", "Upon graduation", "optimization", "within three years"],
                checklist=[
                    "Link your past work to specific analytical modules or practicums in the target programme",
                    "State clearly how you will contribute to the peer cohort",
                    "Conclude with a specific, measurable post-graduation impact plan (250-400 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="C1",
        order=3,
        unit_id="edit-an-application",
        title="Self-editing and tightening high-stakes writing",
        theme="Pruning throat-clearing, upgrading weak verbs, and sharpening structural coherence",
        outcome="Transform bloated drafts into crisp, authoritative 250 to 400 word C1 documents by eliminating filler, sharpening verbs, and aligning topic sentences.",
        grammar_focus=["repetition", "word-choice", "cohesion", "register"],
        vocabulary=["concise", "redundant", "articulate", "spearhead", "consolidate", "streamline", "underscore", "substantiate"],
        lessons=[
            make_lesson(
                level="C1",
                lesson_id="edit-an-application-1",
                title="Eliminating throat-clearing and redundant modifiers",
                markdown=(
                    "### Cutting Metadiscourse ('Throat-Clearing') and Empty Intensifiers\n"
                    "First drafts often waste twenty percent of their word budget on **throat-clearing** (*I would like to take this opportunity to mention that it is very important to note...*) "
                    "and **redundant pairs** (*completely unanimous*, *past history*, *basic fundamentals*).\n\n"
                    "- **Bloated**: *In this paragraph, I want to explain how I was personally responsible for helping to make the onboarding process much faster.*\n"
                    "- **Tightened C1**: *Redesigning our client onboarding workflow cut average setup time from ten days to three.*"
                ),
                model_text=(
                    "Effective self-editing begins by stripping away conversational throat-clearing so that concrete evidence carries every sentence. "
                    "When reviewing my initial application draft for the Regional Product Operations Lead role, I noticed that nearly a third of my opening paragraph consisted of hedged announcements about what I intended to discuss rather than verifiable accomplishments.\n\n"
                    "In the revised version below, I replaced passive metadiscourse with direct action verbs and quantified outcomes. "
                    "Over the past three years at our Hanoi fulfillment hub, I consolidated four regional inventory databases into a unified cloud ledger serving eighty retail partners. "
                    "Previously, warehouse clerks reconciled stock discrepancies manually via weekly email attachments—a slow, error-prone routine that delayed supplier restocking by an average of four business days. "
                    "By partnering with our backend engineering squad to deploy automated barcode-scan validation at the loading dock, I eliminated manual spreadsheet entry entirely and reduced monthly stockouts across high-turnover electronics categories by forty-one percent.\n\n"
                    "Tightening the prose also allowed me to highlight the governance framework that sustained those gains. "
                    "Rather than merely installing new software, I authored a bilingual troubleshooting playbook and trained sixteen shift supervisors to audit exception logs every morning. "
                    "When two newly acquired provincial warehouses joined our network in the fourth quarter, those same supervisor playbooks allowed us to integrate their twelve thousand SKUs in under ten days with zero customer-facing shipping delays. This operational discipline ensured that inventory data accuracy remained above ninety-nine percent through two consecutive peak holiday seasons, preparing me to scale standardized, high-velocity fulfillment workflows across your entire regional distribution network."
                ),
                warmups=[
                    w("fix-the-error", "Cut the redundant modifier pair: 'After reviewing the past history of the project, we combined the two teams together.'", ["After reviewing the project's history, we combined the two teams.", "After reviewing the past history of the project, we combined the two teams together.", "After reviewing the past history, we combined together the teams."], "After reviewing the project's history, we combined the two teams.", "'History' is already in the past, and 'combine' already means bring together."),
                    w("choose", "Which sentence eliminates throat-clearing and leads with high-impact C1 agency?", ["Automating our monthly billing reconciliation saved the finance team 35 hours per quarter.", "I would like to take this opportunity to share that I helped make billing reconciliation faster.", "It goes without saying that billing is a very important thing in every company."], "Automating our monthly billing reconciliation saved the finance team 35 hours per quarter.", "Leading with the specific action and quantified outcome commands immediate respect."),
                    w("gap-fill", "Select the precise verb that replaces 'put four databases together into one': 'I ___ four regional databases into a unified cloud ledger.'", ["consolidated", "scattered", "hesitated"], "consolidated", "'Consolidate [items] into [one system]' is crisp and authoritative."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph professional case narrative or revised application statement (250-400 words) demonstrating zero throat-clearing. Lead every paragraph with a direct analytical claim or action, replace vague phrases ('helped make better') with precise C1 verbs ('consolidated', 'eliminated', 'authored'), and substantiate claims with metrics.",
                scaffold="outline",
                frames=[],
                word_bank=["stripping away", "verifiable", "consolidated", "reconciled", "error-prone", "eliminated", "sustained", "operational discipline"],
                checklist=[
                    "Eliminate all conversational throat-clearing ('I want to talk about...') and redundant pairs",
                    "Use precise C1 verbs ('consolidated', 'reconciled', 'eliminated', 'sustained')",
                    "Substantiate every claim with concrete operational details and metrics (250-400 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="edit-an-application-2",
                title="Repairing broken cohesion with the Known-to-New information flow",
                markdown=(
                    "### The Known-to-New Information Principle\n"
                    "Paragraphs feel disjointed when every sentence starts with an unfamiliar new concept. "
                    "Follow the **Known-to-New contract**:\n\n"
                    "1. Open Sentence B by referencing the **Known** idea just introduced at the end of Sentence A.\n"
                    "2. Close Sentence B with the **New** high-impact information you want to emphasize next."
                ),
                model_text=(
                    "Cohesive executive writing guides the reader effortlessly from familiar context to new analytical insights through deliberate sentence architecture. "
                    "When technical specialists draft project post-mortems or fellowship proposals, they frequently front-load complex new terminology at the start of every sentence, forcing readers to reconstruct the logical bridge on their own.\n\n"
                    "Applying the Known-to-New principle during my recent revision of our cloud-migration post-mortem transformed a fragmented technical log into a persuasive board briefing. "
                    "In the original draft, our engineering team listed three separate database latency incidents without connecting them to customer behavior. "
                    "In the revised narrative, each sentence begins by anchoring back to the preceding operational state: during our September traffic surge, checkout API response times exceeded four seconds across mobile devices. "
                    "That four-second delay triggered a nineteen percent spike in cart abandonment among first-time buyers. "
                    "To halt those abandonments, our infrastructure squad partitioned the regional order table and introduced an in-memory caching layer for active sessions. "
                    "Within forty-eight hours of deploying that cache, median checkout latency fell to 180 milliseconds and conversion rates recovered fully.\n\n"
                    "Structuring technical evidence as an unbroken chain of cause and consequence does more than improve readability. "
                    "Every technical paragraph now follows that same disciplined trajectory: anchoring first in a familiar operational metric, naming the exact customer or financial friction it created, and only then introducing the architectural fix and its verified payoff. By showing non-technical directors exactly how each engineering intervention resolved a specific commercial bottleneck, the revised briefing secured immediate board approval to expand our automated load-testing infrastructure ahead of the Lunar New Year sales peak."
                ),
                warmups=[
                    w("choose", "According to the Known-to-New principle, if Sentence 1 ends with '...checkout response times exceeded four seconds', how should Sentence 2 begin?", ["That four-second delay triggered a 19% spike in cart abandonment.", "A 19% spike in cart abandonment was caused by many factors including four seconds.", "Furthermore, we also have an in-memory caching layer in our system."], "That four-second delay triggered a 19% spike in cart abandonment.", "Echoing the end of Sentence 1 ('exceeded four seconds' -> 'That four-second delay') creates a seamless chain."),
                    w("gap-fill", "Echo the previous noun phrase to maintain Known-to-New flow: '...introduced an in-memory caching layer. Within forty-eight hours of deploying ___, latency fell to 180ms.'", ["that cache", "moreover", "some things"], "that cache", "'deploying that cache' links directly to 'an in-memory caching layer' at the end of the previous sentence."),
                    w("fix-the-error", "Fix the subject-verb agreement with 'does more than': 'Structuring evidence as an unbroken chain do more than improve readability.'", ["Structuring evidence as an unbroken chain does more than improve readability.", "Structuring evidence as an unbroken chain do more than improve readability.", "Structuring evidence as an unbroken chain doing more than improve readability."], "Structuring evidence as an unbroken chain does more than improve readability.", "The singular gerund subject 'Structuring evidence...' takes 'does'."),
                ],
                genre="application letter",
                prompt="Write a 3-paragraph analytical narrative or post-mortem summary (250-400 words) demonstrating strict Known-to-New sentence flow. In your middle paragraph, chain at least four sentences together where the opening of each sentence echoes the ending of the sentence before it.",
                scaffold="outline",
                frames=[],
                word_bank=["architecture", "front-load", "fragmented", "anchoring", "triggered", "To halt", "deploying", "unbroken chain"],
                checklist=[
                    "Chain sentences in paragraph two using the Known-to-New principle ('That delay...', 'To halt those...')",
                    "Avoid starting consecutive sentences with mechanical linkers ('Moreover', 'Furthermore')",
                    "Show how clear technical synthesis led to a concrete organizational decision (250-400 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="edit-an-application-3",
                title="Final C1 editorial polish: rhythm, parallel structure, and authority",
                markdown=(
                    "### Unit 18 Checkpoint: Complete C1 Editorial Polish\n"
                    "Bring together all three C1 editing pillars—**zero throat-clearing**, **nominalized precision**, and **Known-to-New cohesion**—in a polished, publication-ready application or executive statement."
                ),
                model_text=(
                    "Scaling a regional language-learning platform from early adopters to mainstream classrooms requires more than accurate artificial-intelligence models; it demands curriculum architecture that respects how human memory consolidates skill. "
                    "Over the past three years leading product pedagogy for a bilingual writing application in Southeast Asia, I have focused on closing the gap between automated grammar correction and durable learner autonomy.\n\n"
                    "When we launched our initial diagnostic engine, user telemetry revealed a counterintuitive pattern: learners who accepted one-click automated rewrites produced cleaner essays on day one, yet repeated the exact same syntactic errors in unassisted writing two weeks later. "
                    "That retention failure stemmed from passive consumption—clicking an instant fix bypassed the cognitive effort required to notice why a clause broke down. "
                    "To transform passive correction into active retrieval, I collaborated with our engineering and linguistics teams to redesign the feedback loop around passage-linked coaching hints and a spaced-repetition review queue. "
                    "Rather than overwriting a learner's sentence automatically, the revised studio highlights the problematic span, explains the underlying structural rule, and schedules personalized reconstruction drills at one-, three-, and seven-day intervals. "
                    "Across twelve thousand active learners, this pedagogical shift raised thirty-day error-correction retention from thirty-one percent to sixty-eight percent.\n\n"
                    "Demonstrating that rigorous instructional design multiplies the value of large language models has defined my career to date. "
                    "Subsequent longitudinal cohorts confirmed that learners who completed at least four spaced-repetition reconstruction drills per week transferred those grammatical structures accurately into timed exam essays at more than double the rate of control users. Demonstrating that rigorous instructional design multiplies the pedagogical value of large language models has defined my career to date. As Director of Learning Product at your organization, I will apply this evidence-driven methodology to align your generative AI roadmap with measurable long-term learner mastery."
                ),
                warmups=[
                    w("choose", "What makes the semicolon in the opening sentence ('...requires more than accurate AI models; it demands curriculum architecture...') effective?", ["It balances a negative limitation against a positive thesis in one high-impact sentence.", "It replaces a comma after 'However'.", "It joins a sentence fragment to a preposition."], "It balances a negative limitation against a positive thesis in one high-impact sentence.", "A semicolon cleanly links two closely balanced independent clauses."),
                    w("gap-fill", "Complete the parallel Known-to-New link: '...repeated the exact same syntactic errors two weeks later. ___ stemmed from passive consumption.'", ["That retention failure", "Furthermore it", "Because of"], "That retention failure", "'That retention failure' encapsulates the preceding finding and launches the causal explanation."),
                    w("fix-the-error", "Fix the parallel structure after 'highlights..., explains..., and...': 'The studio highlights the span, explains the rule, and scheduling personalized drills.'", ["The studio highlights the span, explains the rule, and schedules personalized drills.", "The studio highlights the span, explaining the rule, and schedules personalized drills.", "The studio highlight the span, explains the rule, and schedules personalized drills."], "The studio highlights the span, explains the rule, and schedules personalized drills.", "Maintain parallel third-person singular verbs: 'highlights..., explains..., and schedules...'."),
                ],
                genre="application letter",
                prompt="Write a polished 3-paragraph executive or fellowship statement (250-400 words) pitching your leadership vision and track record. Use a balanced semicolon or 'more than X; it demands Y' opening, Known-to-New causal chaining in the body, and parallel verb structures throughout.",
                scaffold="none",
                frames=[],
                word_bank=["consolidates", "autonomy", "counterintuitive", "stemmed from", "bypassed", "retrieval", "pedagogical", "evidence-driven"],
                checklist=[
                    "Open with an authoritative claim using a semicolon or 'more than X, it demands Y' contrast",
                    "Chain sentences in paragraph two using Known-to-New summary nouns",
                    "Maintain strict parallel verb structure and zero filler across 250 to 400 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- C2 (300 to 500 words) ---
    make_unit(
        level="C2",
        order=1,
        unit_id="synthesis-and-qualification",
        title="Multi-source synthesis and nuanced qualification",
        theme="Resolving competing paradigms, empirical caveats, and second-order effects",
        outcome="Write authoritative 300 to 500 word analytical essays that synthesize conflicting viewpoints, qualify scope conditions, and trace second-order effects.",
        grammar_focus=["cohesion", "register", "conditionals", "relative-clauses"],
        vocabulary=["dichotomy", "contingent", "second-order", "empirical", "caveat", "predicated", "nuance", "paradigm"],
        lessons=[
            make_lesson(
                level="C2",
                lesson_id="synthesis-and-qualification-1",
                title="Dismantling false dichotomies and specifying scope conditions",
                markdown=(
                    "### Rejecting Binary Framing in Favor of Contingent Synthesis\n"
                    "Public and corporate debates often present a **false dichotomy** (*Either we automate customer service completely, or we keep slow human queues*; *Either cities prioritize heritage preservation, or they build affordable housing*). "
                    "At C2, show why the binary itself is flawed by specifying the **boundary conditions** (`contingent upon`, `insofar as`, `predicated on`) under which competing mechanisms reinforce or undermine each other."
                ),
                model_text=(
                    "Public debate surrounding generative artificial intelligence in software engineering frequently collapses into a sterile dichotomy: either coding assistants will render junior developers obsolete, or they are merely autocomplete toys that inflate technical debt. "
                    "Framing the transition in such binary terms obscures a more consequential structural shift. "
                    "Whether algorithmic code generation elevates engineering productivity or erodes system reliability is contingent upon an organization's architectural modularity and verification culture.\n\n"
                    "Empirical telemetry from enterprise engineering teams illustrates why identical tooling yields divergent outcomes across codebases. "
                    "When developers invoke large language models inside tightly bounded microservices with comprehensive automated test suites and strict static typing, routine boilerplate generation accelerates feature delivery by twenty to thirty percent. "
                    "In these high-feedback environments, compiler checks and integration tests immediately catch subtle hallucinated edge cases before code reaches review. "
                    "Conversely, when teams deploy the same assistants inside monolithic legacy repositories lacking deterministic test coverage, rapid code generation amplifies hidden coupling. "
                    "Junior engineers—and time-pressed senior reviewers—readily accept plausible-looking patches that pass superficial manual inspection while introducing silent race conditions or security regressions.\n\n"
                    "The second-order risk for the software industry is therefore not a sudden disappearance of entry-level roles, but a gradual hollowing out of the apprenticeship ladder through which novices acquire debugging intuition. "
                    "Prior generations of engineers developed mental models of memory management and state flow precisely by wrestling with tedious low-level implementation tasks. "
                    "If organizations automate the routine scaffolding of software without redesigning code-review mentorship and architectural drills, they risk trading short-term velocity for a severe shortage of systems thinkers five years hence. "
                    "Leading engineering organizations are therefore restructuring junior onboarding around adversarial code reading, fault-injection exercises, and formal specification writing rather than raw feature ticket volume. Sustaining software reliability in an era of abundant algorithmic code generation requires shifting human effort from typing boilerplate syntax to specifying system invariants, auditing subtle failure modes, and deliberately cultivating architectural judgment."
                ),
                warmups=[
                    w("choose", "How does a C2 writer dismantle a false dichotomy in the opening paragraph?", ["By showing that both extreme outcomes depend on an underlying condition ('contingent upon').", "By picking one extreme and ignoring all counter-evidence.", "By stating that both sides are equally good and refusing to analyze why."], "By showing that both extreme outcomes depend on an underlying condition ('contingent upon').", "Moving from 'Is X good or bad?' to 'Under what conditions does X produce A vs. B?' is the hallmark of C2 synthesis."),
                    w("gap-fill", "Select the precise C2 adjective meaning 'dependent on specific conditions': 'Whether the policy succeeds is ___ upon transparent local enforcement.'", ["contingent", "oblivious", "redundant"], "contingent", "'contingent upon/on' precisely expresses conditional dependence."),
                    w("fix-the-error", "Fix the correlative conjunction pairing: 'The risk is not a sudden loss of jobs, and a gradual erosion of mentorship.'", ["The risk is not a sudden loss of jobs, but a gradual erosion of mentorship.", "The risk is not a sudden loss of jobs, and a gradual erosion of mentorship.", "The risk is neither a sudden loss of jobs, or a gradual erosion of mentorship."], "The risk is not a sudden loss of jobs, but a gradual erosion of mentorship.", "Pair 'not X' with 'but Y' (and 'neither X' with 'nor Y')."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 analytical essay (300-500 words) dismantling a common false dichotomy in technology, education, urban policy, or economics. Show how the outcome is contingent upon specific structural conditions, trace a second-order consequence, and conclude with a synthesis.",
                scaffold="none",
                frames=[],
                word_bank=["dichotomy", "obscures", "contingent upon", "divergent", "conversely", "second-order", "apprenticeship", "invariants"],
                checklist=[
                    "Open by identifying and dismantling a binary or false dichotomy",
                    "Contrast how the same tool or policy behaves under two different boundary conditions in paragraph two",
                    "Trace a non-obvious second-order consequence in paragraph three (300-500 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C2",
                lesson_id="synthesis-and-qualification-2",
                title="Integrating methodological caveats and evidential weight",
                markdown=(
                    "### Calibrating Epistemic Modality & Methodological Caveats\n"
                    "Masterful analytical prose distinguishes between **what the evidence proves**, **what it merely suggests**, and **where selection bias or confounding variables limit extrapolation**.\n\n"
                    "- **Useful C2 structures**:\n"
                    "  - *Compelling as these initial metrics appear, extrapolating them to... warrants caution.*\n"
                    "  - *Were it not for self-selection among early adopters, observed gains would likely moderate.*"
                ),
                model_text=(
                    "Corporate enthusiasm for remote-first work arrangements and its subsequent backlash in favor of mandatory office returns both suffer from a common analytical flaw: treating short-term productivity snapshots as universal laws of organizational behavior. "
                    "A rigorous synthesis of post-2020 workplace studies reveals that apparent contradictions in the literature stem largely from inconsistent outcome metrics and unexamined survivorship bias.\n\n"
                    "Studies heralding the superiority of fully distributed work frequently measure output in highly standardized, individual-contributor roles—such as patent examination, call-center ticketing, or routine bug triage—where tasks arrive pre-scoped and quality is easily counted. "
                    "Within those bounded parameters, eliminating daily commutes undeniably raises hourly throughput and reduces voluntary attrition. "
                    "Compelling as these micro-efficiency gains appear, extrapolating them to early-stage product discovery or complex cross-disciplinary engineering warrants caution. "
                    "Longitudinal network analyses of enterprise communication logs demonstrate that while remote transitions preserve communication frequency within existing project squads, they sharply reduce spontaneous cross-team ties and asynchronous feedback loops for newly hired juniors.\n\n"
                    "Equally flawed, however, is the assumption among executive mandates that merely compelling employees to swipe badges three days a week restores collaborative serendipity. "
                    "Where organizations enforce physical attendance without coordinating team schedules—leaving staff to sit in half-empty office floors conducting video calls with colleagues in other time zones—mandates incur the friction of commuting without capturing the epistemic benefits of co-location. "
                    "Quarterly empirical reviews of engineering and product squads that adopt this cadence-based model consistently show higher patent and design output alongside lower junior attrition than either fully remote or rigid five-day office mandates achieve alone. Productive organizational design is therefore predicated not on real-estate ideology, but on task-cadence alignment: reserving distributed autonomy for uninterrupted deep execution while structuring intentional, high-bandwidth in-person sprints for architectural discovery, cross-team roadmap alignment, complex post-mortem synthesis, and hands-on engineering onboarding mentorship across globally distributed software product, data science, and cloud infrastructure squads."
                ),
                warmups=[
                    w("choose", "What role does the fronted concession 'Compelling as these micro-efficiency gains appear, ...' play in paragraph two?", ["It grants the data's validity within narrow bounds before exposing over-extrapolation.", "It claims the previous sentence was completely fabricated.", "It changes the topic to an unrelated industry."], "It grants the data's validity within narrow bounds before exposing over-extrapolation.", "Fronted adjective concessions ('Compelling as X appears, ...') are a signature C2 device for calibrating evidential weight."),
                    w("gap-fill", "Complete the C2 Passive/Prepositional structure: 'Effective policy is predicated ___ aligning work location with task complexity.'", ["on", "to", "with"], "on", "Standard C2 collocation: 'be predicated on/upon [something]' (based on a foundational premise)."),
                    w("fix-the-error", "Fix the verb agreement in the complex 'that' clause: 'Data show that while remote work preserves squad chat, it sharply reduce cross-team ties.'", ["Data show that while remote work preserves squad chat, it sharply reduces cross-team ties.", "Data show that while remote work preserves squad chat, it sharply reduce cross-team ties.", "Data shows that while remote work preserves squad chat, it sharply reduces cross-team ties."], "Data show that while remote work preserves squad chat, it sharply reduces cross-team ties.", "The singular pronoun 'it' (referring to 'remote work') requires the singular verb 'reduces'."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 critical synthesis (300-500 words) evaluating conflicting evidence or studies on a major workplace, educational, or economic debate. Use a fronted adjective concession ('Compelling as..., ...'), examine methodological caveats or selection bias, and conclude with a synthesis using 'predicated on'.",
                scaffold="none",
                frames=[],
                word_bank=["survivorship bias", "heralding", "attrition", "Compelling as", "extrapolating", "warrants caution", "longitudinal", "predicated on"],
                checklist=[
                    "Explain why two bodies of evidence appear to conflict by examining how they measure outcomes",
                    "Include a fronted concession ('Compelling as...' or 'Attractive though...')",
                    "Conclude with a synthesis using 'predicated on' across 300 to 500 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C2",
                lesson_id="synthesis-and-qualification-3",
                title="Tracing systemic feedback loops and unintended consequences",
                markdown=(
                    "### Unit 19 Checkpoint: Systemic Synthesis Essay\n"
                    "Demonstrate full C2 analytical command by showing how well-intentioned interventions can trigger perverse incentives or Goodhart's Law—and how multi-dimensional governance prevents distortion."
                ),
                model_text=(
                    "Whenever public institutions or corporations attempt to manage complex human systems through a single quantitative target, they encounter a persistent structural paradox: the moment an indicator becomes the sole criterion for reward or penalty, agents optimize the metric at the expense of the underlying mission. "
                    "Yet abandoning quantitative accountability altogether leaves resource allocation vulnerable to inertia and patronage. "
                    "Designing resilient evaluation frameworks therefore requires pairing primary performance indicators with countervailing quality guardrails that neutralize perverse incentives.\n\n"
                    "Healthcare and educational reforms offer stark illustrations of how one-dimensional metrics distort frontline behavior. "
                    "When hospital systems penalize emergency departments solely for exceeding a four-hour waiting-time threshold, administrators face intense pressure to admit patients prematurely to inpatient wards or delay ambulance handovers outside the entrance—practices that satisfy the clock while compromising clinical triage. "
                    "Analogous distortions emerge in software engineering and academic publishing when promotions hinge on raw commit counts, velocity points, or citation volume. "
                    "Faced with unbuffered numerical quotas, rational practitioners split substantive work into trivial increments, prioritize safe incrementalism over foundational refactoring, and neglect unmeasured stewardship such as peer review.\n\n"
                    "Mitigating metric gaming does not mean retreating into subjective intuition; rather, it demands constructing tensioned metric pairs that cannot be gamed simultaneously. "
                    "In high-reliability engineering organizations, delivery speed metrics—such as deployment frequency and lead time—are explicitly counterbalanced by stability indicators, including change-failure rate and mean time to recovery. "
                    "Similarly, evaluating educational programs by combining immediate test gains with twelve-month retention and qualitative portfolio audits prevents narrow teaching to the test. "
                    "When hospital boards pair emergency wait-time targets with thirty-day unscheduled readmission audits and clinical peer sampling, administrative gaming drops sharply because shortcuts on the clock immediately surface as penalties on the quality ledger. Only by embedding these structural counterweights alongside primary quantitative targets can institutions preserve both rigorous empirical accountability and frontline professional integrity."
                ),
                warmups=[
                    w("gap-fill", "Complete the inverted negative emphasis at the start of the closing sentence: 'Only by embedding structural counterweights ___ institutions preserve both accountability and integrity.'", ["can", "they can", "do can"], "can", "When a sentence begins with 'Only by [gerund phrase]', invert the modal and subject ('can institutions preserve')."),
                    w("choose", "What is the core analytical argument of 'tensioned metric pairs' in paragraph three?", ["Pairing speed metrics with stability metrics prevents gaming one number at system expense.", "Eliminating all numbers so nobody ever measures performance.", "Doubling the punishment for missing a single target."], "Pairing speed metrics with stability metrics prevents gaming one number at system expense.", "Balancing speed against stability resolves the paradox introduced in paragraph one."),
                    w("fix-the-error", "Fix the punctuation and structure around 'rather': 'Mitigating gaming does not mean retreating into intuition, rather it demands balanced metrics.'", ["Mitigating gaming does not mean retreating into intuition; rather, it demands balanced metrics.", "Mitigating gaming does not mean retreating into intuition, rather it demands balanced metrics.", "Mitigating gaming does not mean retreating into intuition rather, it demands balanced metrics."], "Mitigating gaming does not mean retreating into intuition; rather, it demands balanced metrics.", "Use a semicolon before 'rather,' when joining two independent clauses."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 essay (300-500 words) analyzing how single-metric targets create unintended consequences in a domain you know well (such as education, software, healthcare, or business), and propose a balanced multi-metric solution. Include at least one semicolon with 'rather,' and an inverted 'Only by...' sentence.",
                scaffold="none",
                frames=[],
                word_bank=["paradox", "at the expense of", "countervailing", "perverse incentives", "analogous", "hinge on", "simultaneously", "Only by"],
                checklist=[
                    "Frame the opening around the structural tension between accountability and metric distortion",
                    "Illustrate the unintended consequence across two concrete examples in paragraph two",
                    "Use a '; rather,' transition and an inverted 'Only by ... can ...' sentence in paragraph three (300-500 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="C2",
        order=2,
        unit_id="audience-and-register",
        title="Audience adaptation, register mastery, and rhetorical stance",
        theme="Translating complex analysis across executive, technical, and public audiences",
        outcome="Command C2 register shifts, sentence rhythm, and diplomatic framing across 300 to 500 word executive briefs, policy critiques, and public commentary.",
        grammar_focus=["register", "tone-formality", "cohesion", "word-choice"],
        vocabulary=["salient", "distill", "ramification", "stakeholder", "pragmatic", "opaque", "candor", "imperative"],
        lessons=[
            make_lesson(
                level="C2",
                lesson_id="audience-and-register-1",
                title="Distilling complex technical trade-offs for non-specialist executives",
                markdown=(
                    "### Executive Register: Bottom-Line-Up-Front (BLUF) & Translating Jargon into Risk/Return\n"
                    "C2 writers adapt their register to how their audience makes decisions. "
                    "Board members and non-technical directors do not need implementation minutiae; they need **strategic trade-offs** translated into **customer trust, unit economics, regulatory exposure, and opportunity cost**."
                ),
                model_text=(
                    "Executive Briefing: Prioritizing Core Database Partitioning Ahead of the Q1 Regional Expansion\n\n"
                    "Deferring our core order-database partitioning until after the Q1 regional launch in Thailand and Malaysia would expose the company to an unacceptable risk of checkout outages during peak promotional campaigns. "
                    "While reallocating three senior infrastructure engineers for six weeks this quarter will delay two secondary merchant-analytics features by one month, completing the architectural split before January is essential to protect transaction revenue and brand credibility in our new markets.\n\n"
                    "Our current single-cluster database architecture was designed three years ago to process up to four thousand concurrent orders per minute. "
                    "During last month's double-day flash sale in Vietnam, peak transaction volume reached eighty-eight percent of that ceiling, causing intermittent twelve-second payment timeouts for eleven hundred shoppers. "
                    "Adding regional merchant traffic from Bangkok and Kuala Lumpur in Q1 is projected to increase peak-hour order volume by forty-five percent. "
                    "Without isolating regional transaction tables now, a single promotional spike in one country could saturate shared memory locks and halt payment processing across all three national storefronts simultaneously.\n\n"
                    "Splitting the database by market before launch eliminates cross-border failure contagion and lowers per-transaction cloud infrastructure costs by eighteen percent over the coming fiscal year. "
                    "To minimize disruption to the commercial roadmap, our product squad has already isolated the core merchant onboarding flows from the delayed analytics widgets, ensuring that sales teams can sign and activate regional sellers on schedule. "
                    "Conversely, waiting to remediate database contention under live cross-border traffic in February would require emergency maintenance windows during business hours, costing an estimated $140,000 in lost gross merchandise value per hour of downtime and eroding hard-won merchant trust during our launch week. Approving this six-week infrastructure allocation today secures a resilient, fault-isolated, and cost-efficient technical foundation for our Q1 regional revenue growth across all three Southeast Asian markets."
                ),
                warmups=[
                    w("choose", "How does the model briefing make database partitioning intelligible and urgent to non-technical executives?", ["It translates technical limits ('memory locks') into commercial risks ('halting checkout').", "It pastes 200 lines of raw SQL configuration code without explanation.", "It uses vague emotional language like 'Our database feels very sad and tired.'"], "It translates technical limits ('memory locks') into commercial risks ('halting checkout').", "C2 executive writing bridges technical cause to commercial effect."),
                    w("gap-fill", "Select the precise noun for a failure spreading from one unit to another: 'Splitting the database by market eliminates cross-border failure ___.'", ["contagion", "celebration", "nostalgia"], "contagion", "'failure contagion' vividly and concisely conveys systemic spillover risk."),
                    w("fix-the-error", "Fix the participle clause attachment: 'Without isolating regional tables now, a promotional spike could halt payments.' -> Which revision avoids a dangling participle if strict formal grammar is required, or why does the gerund subject in Sentence 1 work cleanly?", ["Deferring our database partitioning would expose the company to checkout outages.", "Having deferred the database, the checkout outage happened.", "Being a senior engineer, the database was partitioned."], "Deferring our database partitioning would expose the company to checkout outages.", "Using a gerund phrase ('Deferring...') as the grammatical subject avoids dangling modifiers completely."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 executive briefing (300-500 words) advising senior non-technical leadership to invest time or budget in a foundational technical, legal, or operational safeguard before launching a major expansion. Lead with a Bottom-Line-Up-Front thesis, translate technical mechanics into commercial risk, and address the roadmap trade-off.",
                scaffold="none",
                frames=[],
                word_bank=["Deferring", "expose", "reallocating", "concurrent", "ceiling", "intermittent", "saturate", "contagion"],
                checklist=[
                    "Lead with a decisive Bottom-Line-Up-Front recommendation and explicit trade-off in paragraph one",
                    "Translate technical or operational capacity thresholds into concrete business impact in paragraph two",
                    "Show how commercial priorities remain protected in paragraph three (300-500 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C2",
                lesson_id="audience-and-register-2",
                title="Diplomatic candor in post-mortems and institutional critiques",
                markdown=(
                    "### Blameless Candor: Critiquing Process Failures Without Personal Attack\n"
                    "When writing an incident post-mortem or policy critique, weak writers either **assign defensive personal blame** (*The marketing team was careless*) "
                    "or **hide behind evasive passive voice** (*Mistakes were made*). "
                    "C2 diplomatic candor names the **systemic process gap** directly and pairs it with **structural remediation**."
                ),
                model_text=(
                    "Post-Mortem Synthesis: Root Causes and Governance Safeguards Following the October Pricing-Display Incident\n\n"
                    "On October 14, a configuration update to our regional currency-conversion service displayed promotional airfares in US dollars without applying local tax surcharges for eighty-two minutes, resulting in 1,420 underpriced bookings and a net margin loss of $38,500. "
                    "While the immediate trigger was an unvalidated environment variable in the staging deployment script, the underlying vulnerability lay in a governance gap between commercial campaign approvals and engineering release checks.\n\n"
                    "A chronological reconstruction of the release reveals three systemic failure points that allowed the misconfiguration to reach production. "
                    "First, our promotional pricing rules were communicated via ad-hoc chat threads rather than a version-controlled schema, leaving the release engineer to transcribe tax-inclusion flags manually under time pressure. "
                    "Second, our automated pre-deployment test suite verified API response speed and currency symbols, but lacked boundary assertions comparing net checkout totals against historic margin floors. "
                    "Third, because real-time anomaly alerts monitored server error rates rather than commercial margin deviation, the discrepancy remained undetected until customer-support tickets surged an hour after launch.\n\n"
                    "Honoring our commitment to affected passengers while preventing recurrence requires hardening both our configuration pipeline and our cross-functional sign-off protocol. "
                    "Rather than relying on manual flag transcription, all promotional fare rules will now be ingested through a strongly typed JSON specification that requires dual automated sign-off from both revenue management and QA before merging. "
                    "In addition, we have deployed a real-time circuit breaker in the checkout service that automatically pauses promotional SKUs whenever net price drops more than fifteen percent below baseline cost. "
                    "Finally, our commercial operations and engineering leads have established a joint fifteen-minute pre-flight verification ritual for all tier-one regional campaigns, backed by synthetic canary transactions that test live checkout totals across every supported currency five minutes before public traffic is routed to promotional landing pages. Institutionalizing these automated guardrails and cross-functional checks transforms a costly one-time operational incident into durable systemic resilience."
                ),
                warmups=[
                    w("choose", "How does the model post-mortem achieve 'blameless candor' in paragraph one?", ["It separates the immediate technical trigger from the deeper governance gap without blame.", "It blames the release engineer by name and demands their dismissal.", "It hides the financial loss and pretends nothing went wrong."], "It separates the immediate technical trigger from the deeper governance gap without blame.", "Separating proximate triggers from systemic root causes builds institutional trust."),
                    w("gap-fill", "Select the precise C2 noun for reconstructing events in time order: 'A chronological ___ of the release reveals three systemic failure points.'", ["reconstruction", "demolition", "speculation"], "reconstruction", "'A chronological reconstruction of...' sets an objective, forensic tone."),
                    w("fix-the-error", "Fix the parallel structure in the 'Rather than..., ...' sentence: 'Rather than rely on manual transcription, all rules will now be ingested through a typed schema.'", ["Rather than relying on manual entry, our pipeline will ingest rules via a typed schema.", "Rather than rely on manual transcription, all rules will now be ingested through a typed schema.", "Rather than relied on manual transcription, all rules ingesting through a schema."], "Rather than relying on manual entry, our pipeline will ingest rules via a typed schema.", "Match the agent of the 'Rather than + gerund' phrase with the subject of the main clause ('our pipeline')."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 incident post-mortem or institutional process critique (300-500 words). Summarize the incident and its quantified impact in paragraph 1, trace three systemic root causes (without personal blame) in paragraph 2, and specify structural guardrails in paragraph 3.",
                scaffold="none",
                frames=[],
                word_bank=["proximate", "vulnerability", "governance gap", "chronological", "ad-hoc", "boundary assertions", "recurrence", "circuit breaker"],
                checklist=[
                    "State the exact scope, duration, and quantified impact of the incident in paragraph one",
                    "Analyze three systemic process gaps (rather than personal blame) in paragraph two",
                    "Specify automated or structural safeguards that prevent recurrence in paragraph three (300-500 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C2",
                lesson_id="audience-and-register-3",
                title="Pacing sentence length and rhetorical rhythm in public commentary",
                markdown=(
                    "### Unit 20 Checkpoint: Mastering Sentence-Length Variation & Rhetorical Rhythm\n"
                    "Monotonous C1 writing strings together five 30-word sentences in a row. "
                    "True C2 prose controls **pacing**: build analytical momentum across two complex clauses, then land a crisp, 6-to-12-word declarative punch that crystallizes the insight."
                ),
                model_text=(
                    "Modern cities love to announce smart-city initiatives through glossy dashboards, autonomous shuttle pilots, and architectural renderings of glass towers draped in vertical forests. "
                    "Yet for the millions of residents who navigate tropical megacities on foot or by bus every day, urban livability rarely hinges on algorithmic spectacle. "
                    "It hinges on shade, drainage, and continuous sidewalks.\n\n"
                    "Walk through any rapidly expanding commercial district in Southeast Asia at two o'clock in the afternoon, and the mismatch between prestige infrastructure and pedestrian reality becomes unmistakable. "
                    "Six-lane boulevards engineered to maximize peak vehicular throughput routinely sever residential alleys from transit stations, forcing commuters to weave between parked motorbikes, broken utility vaults, and unshaded asphalt that radiates forty-five-degree heat. "
                    "When municipal budgets treat tree canopy, permeable paving, and curb-level accessibility as cosmetic afterthoughts rather than core transport infrastructure, even the most expensive metro line struggles to attract last-mile riders. "
                    "A train station nobody can comfortably walk to is only half a transit system.\n\n"
                    "Reclaiming the tropical street does not require futuristic sensors; it requires elevating the mundane physics of human comfort to the center of urban planning. "
                    "Cities that widen shaded arcades, enforce unbroken step-free pavement across commercial driveways, and integrate bioswales along neighborhood collector roads achieve measurable economic and environmental returns. "
                    "Pedestrian footfall in ground-floor shops rises, localized flash-flooding subsides, and short-trip reliance on private vehicles drops organically. "
                    "Where municipal authorities in Taipei, Singapore, and Medellín have systematically reclaimed curbside parking for continuous shaded walkways and neighborhood pocket parks, metro ridership among elderly residents and parents with young children has risen by more than a quarter within twenty-four months. Ultimately, digital sensors and predictive algorithms can optimize a city's traffic lights, but only humane, weather-conscious street design restores the vibrant, inclusive everyday public life that makes a rapidly growing tropical metropolis genuinely livable for residents of every generation."
                ),
                warmups=[
                    w("choose", "Why does the short third sentence in paragraph one ('It hinges on shade, drainage, and continuous sidewalks.') land with such rhetorical force?", ["Its sudden brevity and concrete nouns contrast sharply with the longer sentences before it.", "It uses complicated academic jargon that nobody understands.", "It introduces a grammatical error on purpose."], "Its sudden brevity and concrete nouns contrast sharply with the longer sentences before it.", "Following two long complex sentences with a short, concrete declarative sentence creates memorable rhythm."),
                    w("gap-fill", "Complete the aphoristic punchline in paragraph two: 'A train station nobody can comfortably walk to ___ only half a transit system.'", ["is", "are", "being"], "is", "The singular head noun 'A train station' (modified by the contact relative clause 'nobody can walk to') takes the singular verb 'is'."),
                    w("fix-the-error", "Fix the semicolon contrast structure: 'Reclaiming the street does not require sensors, it requires elevating human comfort.'", ["Reclaiming the street does not require sensors; it requires elevating human comfort.", "Reclaiming the street does not require sensors, it requires elevating human comfort.", "Reclaiming the street does not require sensors; because it requires human comfort."], "Reclaiming the street does not require sensors; it requires elevating human comfort.", "Join two parallel independent clauses ('does not require X; it requires Y') with a semicolon, not a comma splice."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 op-ed or cultural/industry commentary (300-500 words) arguing that a flashy trend in your field overlooks a foundational human or operational truth. Deliberately vary your sentence lengths—pairing multi-clause analytical sentences with at least two short, punchy declarative sentences (under 14 words) and a semicolon contrast.",
                scaffold="none",
                frames=[],
                word_bank=["hinges on", "spectacle", "unmistakable", "throughput", "afterthoughts", "last-mile", "mundane", "organically"],
                checklist=[
                    "Contrast an overhyped trend with a foundational reality in paragraph one",
                    "Include at least two short, punchy declarative sentences (under 14 words) after longer complex clauses",
                    "Use at least one semicolon contrast ('does not require X; it requires Y') across 300 to 500 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
    make_unit(
        level="C2",
        order=3,
        unit_id="critical-capstone",
        title="The C2 critical capstone: precision, concision, and voice",
        theme="Synthesizing complex arguments with surgical concision and distinctive authorial voice",
        outcome="Produce publication-grade 300 to 500 word critical essays and strategic syntheses that exhibit complete lexical precision, structural economy, and rhetorical authority.",
        grammar_focus=["cohesion", "word-choice", "register", "paragraphing"],
        vocabulary=["imperative", "asymmetry", "distill", "compounding", "epistemic", "bedrock", "calibration", "enduring"],
        lessons=[
            make_lesson(
                level="C2",
                lesson_id="critical-capstone-1",
                title="Surgical concision: cutting twenty percent without losing a single nuance",
                markdown=(
                    "### High-Density Compression\n"
                    "At C2, concision is not about writing simplistic short sentences; it is about **maximizing semantic payload per word**. "
                    "Replace roundabout relative clauses (*systems that are able to recover quickly when unexpected shocks happen*) with exact compound modifiers or nouns (*shock-resilient systems*), "
                    "and cut every phrase that merely repeats what your verb already implies."
                ),
                model_text=(
                    "Why do so many corporate strategy documents read like interchangeable amalgamations of ambition and evasion? "
                    "Across industries, leadership teams routinely mistake aspirational goals—expanding market share, delighting customers, accelerating digital transformation—for strategy itself. "
                    "A genuine strategy is defined not by what an organization wishes to achieve, but by the coherent set of trade-offs it commits to making when resources and customer segments conflict.\n\n"
                    "Consider the difference between an unfocused growth wish list and a binding strategic choice in retail banking. "
                    "Declaring an intention to 'deliver world-class omnichannel service to every demographic' provides zero operational guidance when product managers must choose between refurbishing suburban branches or rebuilding a slow mobile brokerage app. "
                    "By contrast, a regional bank that explicitly commits to serving salaried urban professionals under thirty-five makes an immediate series of clarifying exclusions. "
                    "It can close underutilized cash-handling counters, redirect capital into instant cross-border transfers and automated tax-filing tools, and design fee structures around recurring investment deposits rather than brick-and-mortar mortgages. "
                    "Strategy begins the moment leadership names which lucrative customers it is willing to let competitors serve.\n\n"
                    "This discipline of explicit exclusion applies equally to individual craft and product design. "
                    "Products bloated with every requested enterprise toggle eventually collapse under their own cognitive friction, just as essays stuffed with every tangential caveat lose their argumentative spine. "
                    "The same principle governs organizational communication and product roadmaps: when an executive memo defends five competing priorities as equally urgent, frontline teams inevitably fragment their attention across incompatible initiatives and deliver mediocre results on all five. When leadership instead commits to a single load-bearing objective and explicitly defers secondary requests, cross-functional execution accelerates immediately. Whether architecting distributed software, allocating scarce capital, or revising analytical prose, enduring impact comes from the courage to subtract until only the essential load-bearing structure remains to guide clear daily decisions across every level of the organization."
                ),
                warmups=[
                    w("choose", "What makes the sentence 'Strategy begins the moment leadership names which lucrative customers it is willing to let competitors serve' memorable C2 prose?", ["It defines an abstract concept ('strategy') through a sharp, counterintuitive behavioural test.", "It uses passive voice to avoid taking a position.", "It lists ten synonyms for the word 'business'."], "It defines an abstract concept ('strategy') through a sharp, counterintuitive behavioural test.", "Concrete behavioural definitions cut through corporate abstraction."),
                    w("gap-fill", "Complete the architectural metaphor in the final sentence: '...until only the ___ structure remains.'", ["load-bearing", "redundant", "tangential"], "load-bearing", "'load-bearing structure' extends the architectural metaphor with precision."),
                    w("fix-the-error", "Fix the verb agreement in the 'Whether..., ...' sentence: 'Whether building software or revising prose, lasting impact come from courage to subtract.'", ["Whether building software or revising prose, lasting impact comes from courage to subtract.", "Whether building software or revising prose, lasting impact come from courage to subtract.", "Whether building software or revising prose, lasting impact coming from courage to subtract."], "Whether building software or revising prose, lasting impact comes from courage to subtract.", "The singular uncountable subject 'enduring impact' takes 'comes'."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 critical essay (300-500 words) defining what separates genuine mastery or strategy from superficial imitation in your field. Use a 'defined not by X, but by Y' distinction, a concrete contrast case in paragraph 2, and a crisp concluding synthesis.",
                scaffold="none",
                frames=[],
                word_bank=["amalgamations", "aspirational", "defined not by", "trade-offs", "omnichannel", "exclusions", "underutilized", "load-bearing"],
                checklist=[
                    "Open by contrasting superficial imitation with a 'defined not by X, but by Y' thesis",
                    "Illustrate the principle with a concrete decision trade-off in paragraph two",
                    "Deliver maximum semantic density with zero filler across 300 to 500 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C2",
                lesson_id="critical-capstone-2",
                title="Sustaining extended analytical metaphors and conceptual framing",
                markdown=(
                    "### Conceptual Framing: Using Structural Metaphors to Illuminate Invisible Systems\n"
                    "The strongest C2 essays anchor complex socio-technical or economic dynamics in a coherent **structural frame** "
                    "(such as *compounding interest vs. technical debt*, *immunological memory*, or *ecological monoculture*), "
                    "using that frame to reveal hidden vulnerabilities without over-straining the comparison."
                ),
                model_text=(
                    "In software engineering, the metaphor of 'technical debt'—coined by Ward Cunningham to explain why shipping a hasty design requires paying 'interest' in future refactoring—has become the universal language for negotiating engineering time with business executives. "
                    "Equally consequential, however, is a parallel phenomenon that organizations rarely audit: **pedagogical and linguistic debt** in how professionals acquire skill.\n\n"
                    "When a learner or junior practitioner relies on automated tools to generate polished emails, essays, or code without wrestling with underlying syntactic and logical choices, they take out a high-interest cognitive loan. "
                    "In the short term, the borrowed output looks indistinguishable from expert competence, allowing the user to clear daily deliverables with minimal friction. "
                    "Yet because fluency is a compounding asset built through active retrieval and error correction, outsourcing the struggle of formulation prevents the brain from encoding durable mental schemas. "
                    "Each skipped revision compounds the deficit: six months later, when confronted with a high-stakes negotiation, a live architectural review, or an unscripted client crisis where automated scaffolding is unavailable, the practitioner lacks the foundational repertoire to think on their feet.\n\n"
                    "Retiring cognitive debt requires the same deliberate amortisation that rescues a brittle codebase. "
                    "Rather than banning assistive tools outright, wise learners and organizations separate *production velocity* from *deliberate practice*. "
                    "They reserve protected daily blocks where drafts are composed from scratch, errors are diagnosed against explicit structural principles, and revised patterns are rehearsed across spaced intervals until they become automatic. "
                    "Just as a software team that allocates twenty percent of every sprint to refactoring and automated testing ultimately ships features faster than a team buried under unserviced technical shortcuts, writers and analysts who invest daily effort in unassisted structural formulation build an ever-expanding mental library of syntactic and rhetorical moves. Generative tools can dramatically accelerate a prepared mind, but they cannot compound intellectual capability on behalf of a passive one."
                ),
                warmups=[
                    w("choose", "How does the model essay sustain the 'debt vs. compounding asset' metaphor across all three paragraphs without sounding cliché?", ["It maps financial mechanics (loans, compounding, amortisation) onto cognitive practice.", "It repeats the word 'money' twenty times in every paragraph.", "It abandons the metaphor after the first sentence."], "It maps financial mechanics (loans, compounding, amortisation) onto cognitive practice.", "A structural metaphor works when the underlying mechanisms genuinely parallel each other."),
                    w("gap-fill", "Complete the fronted adjective inversion in paragraph one: '___ consequential, however, is a parallel phenomenon that organizations rarely audit.'", ["Equally", "Equal", "Equality"], "Equally", "'Equally consequential, however, is [subject]' is an elegant C2 transition between two parallel concepts."),
                    w("fix-the-error", "Fix the article before a consonant sound in the final line: '...on behalf of an passive one.'", ["...on behalf of a passive one.", "...on behalf of an passive one.", "...on behalf of the passive one."], "...on behalf of a passive one.", "Use 'a' before a consonant sound ('passive'), and 'an' before a vowel sound."),
                ],
                genre="critical revision",
                prompt="Write a 3-paragraph C2 essay (300-500 words) using a coherent conceptual metaphor (such as financial compounding, architectural load, or ecological resilience) to illuminate a modern challenge in learning, work, or technology. Map the mechanism cleanly in paragraph 2 and propose a disciplined solution in paragraph 3.",
                scaffold="none",
                frames=[],
                word_bank=["coined", "consequential", "indistinguishable", "compounding", "retrieval", "repertoire", "amortisation", "deliberate practice"],
                checklist=[
                    "Introduce a clear structural metaphor in paragraph one using 'Equally consequential, however, is...'",
                    "Map the cause-and-effect mechanics of the metaphor onto real behavior in paragraph two",
                    "Close with a disciplined resolution and a memorable final contrast sentence (300-500 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C2",
                lesson_id="critical-capstone-3",
                title="Zero-to-Hero Capstone: The Craft of Thinking in Print",
                markdown=(
                    "### Unit 21 Checkpoint: The C2 Mastery Capstone\n"
                    "In this final checkpoint of the Zero-to-Hero path, synthesize your philosophy and mastery of written craft in a fully unassisted, publication-ready 300 to 500 word essay. "
                    "Demonstrate thesis qualification, Known-to-New cohesion, varied sentence rhythm, and uncompromising clarity."
                ),
                model_text=(
                    "Writing is routinely taught as a transcription service for thoughts already fully formed inside the head—a mechanical exercise in dressing pre-existing ideas in grammatically respectable clothes. "
                    "Anyone who has ever sat down to draft a complex technical specification, a policy argument, or a candid personal reflection knows the opposite to be true. "
                    "We do not write because we already understand what we think; we write in order to discover where our thinking is still vague, contradictory, or incomplete.\n\n"
                    "Inside the forgiving privacy of unvoiced intuition, half-baked arguments feel effortlessly persuasive. "
                    "Mental leaps glide over missing causal links, ambiguous pronouns masquerade as deep connections, and trade-offs coexist without friction. "
                    "The blank page refuses to cooperate with that illusion. "
                    "Committing a claim to visible syntax forces a confrontation with linear logic: every subject demands an exact verb, every assertion exposes its underlying premise, and every transition between paragraphs reveals whether two ideas genuinely follow or merely sit side by side. "
                    "When a sentence stubbornly resists clear phrasing on the third revision, the obstacle is almost never a shortage of vocabulary; it is a muddled thought that has not yet earned its shape.\n\n"
                    "Mastering a second language amplifies this epistemic discipline. "
                    "Because non-native writers cannot coast on inherited idioms or reflexively familiar clichés, they must build meaning deliberately from the ground up—weighing register, testing clause boundaries, and auditing every connector for earned precision. "
                    "Every time a writer replaces a vague qualifier with a verifiable mechanism, prunes a self-indulgent tangent, or restructures a paragraph so that familiar context prepares the reader for a complex new insight, they practice cognitive empathy at the highest level. Clarity on the page is never merely decorative; it is the visible trace of disciplined thought made accessible to another mind. What begins at Pre-A1 as a humble effort to join five words into an honest statement matures by C2 into an enduring intellectual advantage: the habit of treating every draft as an instrument of inquiry, and every revision as an act of respect for the reader's time."
                ),
                warmups=[
                    w("choose", "Why does the model capstone argue that 'when a sentence stubbornly resists clear phrasing, the obstacle is almost never a shortage of vocabulary'?", ["Because structural awkwardness on the page usually signals an unresolved gap in thought.", "Because vocabulary does not exist in English.", "Because revising a draft is a waste of time."], "Because structural awkwardness on the page usually signals an unresolved gap in thought.", "Treating revision as a diagnostic tool for thinking is the highest level of writing maturity."),
                    w("gap-fill", "Complete the balanced C2 definition of purpose: 'We do not write because we already understand what we think; we write ___ discover where our thinking is incomplete.'", ["in order to", "because of", "despite"], "in order to", "'in order to + base verb' highlights deliberate intellectual purpose."),
                    w("fix-the-error", "Fix the nominal clause verb agreement: 'What begins at A1 as a humble effort mature by C2 into an enduring advantage.'", ["What begins at A1 as a humble effort matures by C2 into an enduring advantage.", "What begins at A1 as a humble effort mature by C2 into an enduring advantage.", "What begin at A1 as a humble effort matures by C2 into an enduring advantage."], "What begins at A1 as a humble effort matures by C2 into an enduring advantage.", "A singular 'What...' nominal clause subject ('What begins at A1...') takes a singular main verb ('matures')."),
                ],
                genre="critical revision",
                prompt="Write your 3-paragraph C2 Capstone Essay (300-500 words) reflecting on how rigorous writing, analytical revision, or mastering a complex craft transforms how a person thinks and solves problems in your field. Demonstrate full C2 command of thesis framing, sentence rhythm, Known-to-New cohesion, and lexical precision.",
                scaffold="none",
                frames=[],
                word_bank=["transcription", "contradictory", "masquerade", "confrontation", "premise", "epistemic", "deliberately", "enduring"],
                checklist=[
                    "Open by challenging a conventional assumption using a semicolon contrast",
                    "Vary sentence lengths deliberately, pairing complex analytical clauses with crisp declarative statements",
                    "Synthesize your argument into an authoritative 300 to 500 word capstone essay",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
])


# ============================================================================
# PART 4: IELTS WRITING WORKSPACE CURRICULUM (8 Units / 24 Lessons)
# ============================================================================

IELTS_UNITS: list[dict[str, Any]] = [
    # --- IELTS UNIT 1: Academic Task 1 — Dynamic Charts (B1: 100-180 words) ---
    make_unit(
        level="B1",
        order=4,
        unit_id="ielts-task1-dynamic-charts",
        title="IELTS Task 1: Dynamic line graphs and time-series bar charts",
        theme="IELTS Academic Task 1 — Summarizing trends, peaks, and overviews over time",
        outcome="Write Band 7+ IELTS Academic Task 1 reports (150-180 words) for dynamic charts with a clear 2-sentence overview and precise trend vocabulary.",
        grammar_focus=["verb-tense", "comparatives-superlatives", "prepositions", "task-response"],
        vocabulary=["overall", "upward trend", "surged", "declined steadily", "peaked at", "overtook", "fluctuated", "respectively"],
        lessons=[
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-dynamic-charts-1",
                title="Paraphrasing the prompt and writing a Band 7+ Overview",
                markdown=(
                    "### The Golden Rule of IELTS Academic Task 1: Never Skip the Overview\n"
                    "To score **Band 7+ in Task Achievement**, your report needs a dedicated **Overview paragraph** (placed immediately after your 1-sentence introduction) "
                    "that summarizes 2–3 macro trends across the entire period **without quoting specific numbers**.\n\n"
                    "- **Paragraph 1 (Introduction)**: Paraphrase the chart title (`The line graph illustrates the proportion of households... between 2005 and 2025.`).\n"
                    "- **Paragraph 2 (Overview)**: `Overall, it is clear that [Category A and B] followed an upward trend, whereas [Category C] declined steadily over the twenty-year period. Additionally, [Category A] became the most popular option by the end of the timeframe.`"
                ),
                model_text=(
                    "The line graph compares the percentage of commuters in a European city who used four different modes of transport—cars, buses, bicycles, and the metro—between 2000 and 2020.\n\n"
                    "Overall, it is clear that metro and bicycle usage experienced significant growth over the twenty-year period, whereas reliance on private cars and buses declined. "
                    "Notably, although cars were by far the most common transport choice in 2000, the metro overtook them to become the primary commuter mode by 2020.\n\n"
                    "In 2000, just over half of all commuters (52%) drove to work, while bus passengers accounted for 28% of the total. "
                    "Over the next two decades, car usage fell steadily to 31% in 2020, and bus ridership dropped by half to 14%. "
                    "Conversely, the share of metro commuters more than doubled from 15% in 2000 to a peak of 37% in 2020, surpassing cars in 2015. "
                    "Similarly, cycling rose threefold from 5% to 18% over the same timeframe."
                ),
                warmups=[
                    w("choose", "What belongs in a Band 7+ IELTS Task 1 Overview paragraph?", ["The main overall trends and highest/lowest transitions without specific percentages or dates.", "Every single number from every year in the chart.", "Your personal opinion on why people should ride bicycles."], "The main overall trends and highest/lowest transitions without specific percentages or dates.", "Save specific figures for Body Paragraphs 3 and 4; keep the Overview focused on macro trends."),
                    w("gap-fill", "Select the verb meaning 'passed another line to become higher': 'The metro ___ private cars in 2015 to become the leading mode.'", ["overtook", "undertook", "mistook"], "overtook", "'overtook' (past of overtake) or 'surpassed' is ideal when two lines cross on a graph."),
                    w("fix-the-error", "Fix the preposition for the total change: 'Bus ridership dropped of 14% between 2000 and 2020.'", ["Bus ridership dropped by 14% between 2000 and 2020.", "Bus ridership dropped of 14% between 2000 and 2020.", "Bus ridership dropped at 14% between 2000 and 2020."], "Bus ridership dropped by 14% between 2000 and 2020.", "With verbs of rise/fall, use 'by' for the size of the difference and 'to' for the final level."),
                ],
                genre="paragraphs",
                prompt="IELTS Academic Task 1 (150-180 words): A line graph shows the percentage of households in Country X with access to Fiber Broadband (2010: 12%, 2015: 38%, 2020: 74%), Mobile 4G/5G Data (2010: 20%, 2015: 55%, 2020: 88%), and Fixed Dial-Up/ADSL (2010: 65%, 2015: 40%, 2020: 9%). Write a complete report with a paraphrased introduction, a 2-sentence Overview, and a detailed data paragraph.",
                scaffold="outline",
                frames=[],
                word_bank=["compares", "Overall, it is clear that", "upward trend", "whereas", "overtook", "accounted for", "conversely", "surpassing"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Paraphrase the chart prompt in sentence one using 'between 2010 and 2020'",
                    "Include a 2-sentence Overview starting with 'Overall,' without quoting numbers",
                    "Contrast the rising technologies with the falling one using accurate figures (150-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-dynamic-charts-2",
                title="Varying trend structures: Verb+Adverb vs. Adjective+Noun",
                markdown=(
                    "### Boosting Grammatical Range in Trend Descriptions\n"
                    "To move from Band 6.0 to Band 7.5 in **Grammatical Range and Accuracy**, alternate between two core trend structures:\n\n"
                    "1. **`Subject + Verb + Adverb`**: `Solar generation rose sharply from 10% to 35%.`\n"
                    "2. **`There was a + Adjective + Noun + in...` / `Subject + experienced a + Adjective + Noun`**: `Solar generation experienced a sharp rise over the decade.`"
                ),
                model_text=(
                    "The bar chart illustrates annual electricity generation by source—coal, natural gas, and renewables—in terawatt-hours (TWh) in a Southeast Asian nation from 2012 to 2022.\n\n"
                    "Overall, total renewable electricity output expanded dramatically over the decade, while coal-fired generation followed a downward trajectory after 2017. "
                    "Natural gas remained a stable contributor throughout the ten-year period.\n\n"
                    "In 2012, coal generated 120 TWh of electricity, making it the dominant power source. "
                    "After reaching a peak of 135 TWh in 2017, coal output experienced a noticeable decline, falling to 90 TWh by 2022. "
                    "Meanwhile, natural gas saw minor fluctuations between 75 TWh and 82 TWh across the entire decade. "
                    "In contrast, renewable energy—comprising solar and wind—started at a modest 15 TWh in 2012 and grew gradually to 30 TWh in 2017. "
                    "Over the final five years, there was a dramatic surge in renewable output, which climbed more than threefold to finish at 105 TWh in 2022, overtaking coal for the first time."
                ),
                warmups=[
                    w("gap-fill", "Convert 'rose sharply' into an adjective+noun phrase: 'Over the final five years, there was a ___ in renewable output.'", ["sharp rise", "sharply rise", "rose sharp"], "sharp rise", "After 'there was a...', use an adjective ('sharp') + singular noun ('rise' / 'surge')."),
                    w("fix-the-error", "Fix the preposition after the noun 'decline': 'Coal output experienced a noticeable decline of 90 TWh in 2022 (from 135 TWh).'", ["Coal output experienced a noticeable decline to 90 TWh in 2022.", "Coal output experienced a noticeable decline at 90 TWh in 2022.", "Coal output experienced a noticeable decline on 90 TWh in 2022."], "Coal output experienced a noticeable decline to 90 TWh in 2022.", "Use 'a decline to [final number]' or 'a decline of [difference: 45 TWh]'."),
                    w("choose", "Which participle phrase cleanly attaches a final milestone to the end of a sentence?", ["...climbed to 105 TWh in 2022, overtaking coal for the first time.", "...climbed to 105 TWh in 2022, overtake coal for the first time.", "...climbed to 105 TWh in 2022, and overtook is coal."], "...climbed to 105 TWh in 2022, overtaking coal for the first time.", "Adding ', overtaking...' or ', reaching a peak of...' boosts grammatical range naturally."),
                ],
                genre="paragraphs",
                prompt="IELTS Academic Task 1 (150-180 words): A time-series bar chart shows annual book sales (in millions of copies) across three formats in the UK from 2014 to 2024: Hardcover Print (2014: 80m, 2019: 78m, 2024: 82m), E-books (2014: 65m, 2019: 50m, 2024: 38m), and Audiobooks (2014: 12m, 2019: 35m, 2024: 74m). Write a report alternating between 'Verb + Adverb' and 'Adjective + Noun' trend structures.",
                scaffold="outline",
                frames=[],
                word_bank=["illustrates", "trajectory", "experienced a", "fluctuations", "there was a", "surge", "threefold", "overtaking"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Include a clear Introduction and a number-free Overview paragraph",
                    "Use both 'verb + adverb' ('fell steadily') and 'adjective + noun' ('a dramatic surge')",
                    "Cite exact figures from 2014, 2019, and 2024 without offering personal opinions (150-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-dynamic-charts-3",
                title="Checkpoint: Full 20-year dynamic line graph report",
                markdown=(
                    "### IELTS Unit 1 Checkpoint: Unassisted Dynamic Graph Report\n"
                    "Group your detailed figures into two logical body paragraphs (e.g., **Paragraph 3: Rising Categories** and **Paragraph 4: Falling/Stable Categories**) "
                    "so the examiner sees clear **Coherence and Cohesion**."
                ),
                model_text=(
                    "The line graph illustrates the average monthly household expenditure (in US dollars) on three communication categories—landline telephone calls, mobile phone plans, and home broadband internet—in an Asian country between 2004 and 2024.\n\n"
                    "Overall, household spending on mobile plans and home broadband increased substantially over the twenty-year period, whereas expenditure on traditional landline calls plummeted. "
                    "Although landline services represented the largest monthly expense in 2004, mobile plans became the highest-spending category from 2012 onward.\n\n"
                    "In 2004, families spent an average of $45 per month on landline calls, compared with $22 on mobile plans and just $10 on home internet. "
                    "Over the following decade, landline spending experienced a steep drop to $18 in 2014 before falling further to a negligible $4 per month by 2024. "
                    "In contrast, monthly expenditure on mobile plans surged past landlines in 2010 and reached $68 in 2024, more than tripling its initial figure. "
                    "Similarly, broadband spending grew steadily throughout the period, rising fivefold from $10 in 2004 to $52 in 2024."
                ),
                warmups=[
                    w("choose", "Why is grouping rising categories in one body section and falling categories in another better than describing 2004, then 2008, then 2012 year by year?", ["Grouping by trend pattern highlights analytical comparisons instead of producing a mechanical list.", "It lets you skip half the lines on the graph.", "It makes the essay shorter than 80 words."], "Grouping by trend pattern highlights analytical comparisons instead of producing a mechanical list.", "Examiners award Band 7+ when you group data logically by trend or feature."),
                    w("gap-fill", "Select the precise adverbial multiplier: 'Broadband spending rose ___ from $10 in 2004 to $50 in 2024.'", ["fivefold", "five-times-ly", "fifth"], "fivefold", "Use 'twofold / threefold / fivefold' right after the verb to express exact multiplication."),
                    w("fix-the-error", "Fix the verb tense for a finished historical range (2004–2024): 'In 2004, families spend $45 on landline calls.'", ["In 2004, families spent $45 on landline calls.", "In 2004, families spend $45 on landline calls.", "In 2004, families have spent $45 on landline calls."], "In 2004, families spent $45 on landline calls.", "Always use the past simple ('spent') for completed past years."),
                ],
                genre="paragraphs",
                prompt="IELTS Academic Task 1 Checkpoint (150-180 words): A line graph shows the percentage of total retail sales made through three channels in Country Y from 2005 to 2025: Large Supermarkets (2005: 58%, 2015: 54%, 2025: 49%), Independent Local Shops (2005: 36%, 2015: 24%, 2025: 13%), and Online E-Commerce (2005: 6%, 2015: 22%, 2025: 38%). Write a full Band 7+ report.",
                scaffold="checklist",
                frames=[],
                word_bank=["illustrates", "Overall", "plummeted", "from ... onward", "compared with", "steep drop", "in contrast", "surged"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Write an Introduction, a 2-sentence Overview, and logically grouped body details",
                    "Keep all historical figures in the past simple tense",
                    "Include at least two comparisons across categories and write 150 to 180 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- IELTS UNIT 2: Academic Task 1 — Static Charts & Tables (B1: 100-180 words) ---
    make_unit(
        level="B1",
        order=5,
        unit_id="ielts-task1-static-comparisons",
        title="IELTS Task 1: Static tables, pie charts, and clustered bars",
        theme="IELTS Academic Task 1 — Grouping rankings, proportions, and cross-category outliers",
        outcome="Write Band 7+ IELTS Academic Task 1 reports (150-180 words) for single-year tables and pie charts using comparative rankings and proportion phrases.",
        grammar_focus=["comparatives-superlatives", "determiners", "cohesion", "task-response"],
        vocabulary=["proportion", "accounted for", "lion's share", "marginally", "twice as high as", "by contrast", "outlier", "ranked"],
        lessons=[
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-static-comparisons-1",
                title="Describing proportions and fractions in pie charts and tables",
                markdown=(
                    "### Translating Raw Percentages into Varied Proportion Phrases\n"
                    "When a static chart has no time movement, avoid using *rose* or *fell*! "
                    "Instead, vary how you express **shares and proportions** by alternating exact percentages with clean fraction phrases:\n\n"
                    "- `49%` → *just under half of the total (49%)*\n"
                    "- `33%` → *roughly one-third (33%)*\n"
                    "- `26%` → *slightly more than a quarter (26%)*\n"
                    "- `76%` → *just over three-quarters (76%)*"
                ),
                model_text=(
                    "The two pie charts compare the proportion of household water consumption across five domestic activities in Sydney and Tokyo in 2023.\n\n"
                    "Overall, outdoor garden watering accounted for the largest share of residential water use in Sydney, whereas indoor bathroom activities—specifically showers and baths—dominated consumption in Tokyo. "
                    "Kitchen water use represented the smallest category in both cities.\n\n"
                    "In Sydney, garden irrigation consumed just over two-fifths (42%) of total household water, which was more than four times the figure recorded in Tokyo (9%). "
                    "Showers and baths ranked second in Sydney at roughly one-quarter (24%), followed by laundry at 18% and toilet flushing at 10%. "
                    "By contrast, households in Tokyo used nearly half of their water (46%) for showers and baths, nearly double Sydney's share. "
                    "Laundry and toilet flushing in Tokyo accounted for 22% and 16% respectively, while kitchen dishwashing and cooking made up a mere 6% in Sydney and 7% in Tokyo."
                ),
                warmups=[
                    w("choose", "Why must you NEVER write 'Garden watering rose to 42%' when describing a single-year 2023 pie chart?", ["Because a static single-year chart shows fixed shares at one point in time, not trends.", "Because 42% is smaller than 9%.", "Because pie charts never contain numbers."], "Because a static single-year chart shows fixed shares at one point in time, not trends.", "Using trend verbs ('rose/fell') on a static single-year chart is a classic Band 5.5 Task Achievement mistake."),
                    w("gap-fill", "Select the accurate fraction approximation for 24%: 'Showers ranked second in Sydney at ___ (24%).'", ["roughly one-quarter", "nearly three-quarters", "just over half"], "roughly one-quarter", "25% is one-quarter, so 24% is 'roughly one-quarter' or 'just under a quarter'."),
                    w("fix-the-error", "Fix the placement of 'respectively': 'Laundry and toilet flushing accounted for respectively 22% and 16%.'", ["Laundry and toilet flushing accounted for 22% and 16% respectively.", "Respective laundry and toilet flushing accounted for 22% and 16%.", "Laundry and toilet flushing accounted for respectively 22% and 16%."], "Laundry and toilet flushing accounted for 22% and 16% respectively.", "Place 'respectively' at the end of the clause after the two paired numbers."),
                ],
                genre="paragraphs",
                prompt="IELTS Academic Task 1 (150-180 words): Two pie charts show how university students in Domestic Dormitories vs. Off-Campus Apartments spent their monthly living budget in 2024: Housing & Utilities (Dorm: 38%, Apartment: 52%), Food & Groceries (Dorm: 32%, Apartment: 21%), Transport (Dorm: 6%, Apartment: 15%), and Leisure & Books (Dorm: 24%, Apartment: 12%). Write a static comparison report using fraction approximations and 'respectively'.",
                scaffold="outline",
                frames=[],
                word_bank=["proportion", "accounted for", "dominated", "just over", "roughly one-quarter", "by contrast", "respectively", "mere"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Avoid trend verbs ('rose/fell'); use static verbs ('accounted for', 'made up', 'represented')",
                    "Pair exact percentages with at least two fraction phrases ('just over half', 'roughly a quarter')",
                    "Use 'respectively' accurately to report paired figures (150-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-static-comparisons-2",
                title="Grouping multi-row tables by highs, lows, and outliers",
                markdown=(
                    "### Conquering Complex Tables: Group by Pattern, Not Row by Row\n"
                    "When given a 5-row by 4-column table, describing every cell in order creates a confusing wall of numbers. "
                    "Instead, divide your body paragraphs into **Group 1 (Top-Ranking Rows / Outliers)** and **Group 2 (Lower-Ranking Rows / Narrow Gaps)**."
                ),
                model_text=(
                    "The table compares five countries—Norway, South Korea, Germany, Brazil, and Vietnam—in terms of electric vehicle (EV) market share, public charging stations per 100,000 residents, and average government purchase subsidies in 2024.\n\n"
                    "Overall, Norway led by a wide margin in both EV adoption and charging density despite offering tax exemptions rather than direct cash subsidies, whereas South Korea maintained the highest density of public chargers relative to its moderate EV share. "
                    "Brazil recorded the lowest figures across all three indicators.\n\n"
                    "Norway stood out as a clear outlier in adoption, with electric models accounting for 82% of new car sales and 490 public chargers per 100,000 residents. "
                    "Germany and South Korea occupied the middle tier of vehicle sales at 24% and 16% respectively, matched by substantial buyer subsidies of $4,800 and $5,200. "
                    "Remarkably, however, South Korea boasted 510 public chargers per 100,000 people—slightly higher than Norway's network. "
                    "By contrast, Vietnam (14% EV share) outpaced Brazil (4% EV share) more than threefold in adoption, even though both emerging markets had fewer than 45 public chargers per 100,000 residents."
                ),
                warmups=[
                    w("choose", "What makes South Korea 'remarkable' in the model table report?", ["It had the highest charger density (510) despite having a moderate 16% EV sales share.", "It had 0% electric vehicles.", "It is located in Europe."], "It had the highest charger density (510) despite having a moderate 16% EV sales share.", "Spotting where a country breaks the expected ranking pattern ('Remarkably, however,...') is a Band 8 analytical skill."),
                    w("gap-fill", "Complete the precision modifier before a comparative adjective: 'South Korea's charger density was ___ higher than Norway's network.'", ["slightly", "very", "more"], "slightly", "Use 'slightly / marginally / substantially / far' before a comparative adjective ('higher')."),
                    w("fix-the-error", "Fix the comparative structure: 'Norway's EV share was over three times higher as Germany's.'", ["Norway's EV share was over three times as high as Germany's.", "Norway's EV share was over three times higher as Germany's.", "Norway's EV share was over three times high than Germany's."], "Norway's EV share was over three times as high as Germany's.", "Use 'three times as [adjective] as' (or 'three times higher than')."),
                ],
                genre="paragraphs",
                prompt="IELTS Academic Task 1 (150-180 words): A 2024 table compares four cities (Singapore, Zurich, Taipei, and Bangkok) across three metrics: Public Transit Share of Commutes (Singapore: 67%, Zurich: 64%, Taipei: 58%, Bangkok: 29%), Average Monthly Transit Pass Cost (Singapore: $95, Zurich: $185, Taipei: $42, Bangkok: $48), and Average One-Way Commute Time (Singapore: 38 mins, Zurich: 31 mins, Taipei: 36 mins, Bangkok: 54 mins). Write a static report grouping the data logically.",
                scaffold="outline",
                frames=[],
                word_bank=["in terms of", "by a wide margin", "outlier", "middle tier", "remarkably", "slightly higher than", "by contrast", "even though"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Summarize the overarching leaders and lowest-ranking city in the Overview",
                    "Highlight at least one cross-column contrast (such as Taipei's low pass cost despite high ridership)",
                    "Use degree modifiers ('slightly', 'substantially') with comparatives (150-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-static-comparisons-3",
                title="Checkpoint: Clustered bar chart across age groups or genders",
                markdown=(
                    "### IELTS Unit 2 Checkpoint: Comparing Demographic Patterns\n"
                    "In clustered bar charts comparing age brackets or genders, organize your report around **where the groups diverge sharply** versus **where they behave similarly**."
                ),
                model_text=(
                    "The clustered bar chart compares the percentage of people in three age brackets (18–29, 30–49, and 50+) who participated in five leisure activities—jogging, team sports, gym workouts, cycling, and gardening—in Australia in 2024.\n\n"
                    "Overall, physical participation preferences shifted markedly with age: younger adults strongly favored gym workouts and team sports, whereas gardening was overwhelmingly dominated by the 50+ age group. "
                    "In contrast, cycling attracted a relatively similar share of participants across all three generations.\n\n"
                    "Among 18-to-29-year-olds, gym workouts were the most popular activity at 44%, followed closely by team sports at 36%. "
                    "Participation in both categories declined progressively in older brackets, with only 14% of people aged 50 and over using a gym and just 7% playing team sports. "
                    "Conversely, gardening showed the opposite pattern, engaging 48% of the 50+ cohort compared with 22% of 30–49-year-olds and a mere 6% of young adults. "
                    "Meanwhile, jogging peaked in the 30–49 bracket at 34%, while cycling remained steady across all ages between 19% and 23%."
                ),
                warmups=[
                    w("choose", "What are the three structural patterns identified in the model's body paragraphs?", ["Activities that fall with age, activities that rise with age, and age-neutral activities.", "Activities done on Monday, Tuesday, and Wednesday.", "Only the numbers for 18-29-year-olds."], "Activities that fall with age, activities that rise with age, and age-neutral activities.", "Grouping categories by their demographic direction makes a 15-bar chart effortless to read."),
                    w("gap-fill", "Select the verb that shows a category reaching its highest level in the middle group: 'Jogging ___ in the 30–49 bracket at 34%.'", ["peaked", "plummeted", "vanished"], "peaked", "'peaked in [group] at [X]%' works for both time peaks and demographic peaks."),
                    w("fix-the-error", "Fix the hyphenation in the plural age noun: 'Among 18-to-29-years-old, gym workouts were the top choice.'", ["Among 18-to-29-year-olds, gym workouts were the top choice.", "Among 18-to-29-years-old, gym workouts were the top choice.", "Among 18-to-29-year-old, gym workouts were the top choice."], "Among 18-to-29-year-olds, gym workouts were the top choice.", "The plural noun form puts '-s' at the very end: '18-to-29-year-olds'."),
                ],
                genre="paragraphs",
                prompt="IELTS Academic Task 1 Checkpoint (150-180 words): A clustered bar chart shows the primary news source (%) for three age groups (18–29, 30–49, 50+) in 2024: Social Media Apps (18–29: 54%, 30–49: 31%, 50+: 12%), Online News Websites (18–29: 28%, 30–49: 42%, 50+: 30%), Television News (18–29: 11%, 30–49: 20%, 50+: 49%), and Print/Radio (18–29: 7%, 30–49: 7%, 50+: 9%). Write a complete Band 7+ static comparison report.",
                scaffold="checklist",
                frames=[],
                word_bank=["compares", "shifted markedly", "overwhelmingly", "dominated by", "declined progressively", "conversely", "peaked", "remained steady"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Include a clear Introduction and a 2-sentence Overview highlighting the age contrast and the steady category",
                    "Group categories logically by pattern (youth-skewed, older-skewed, middle-peaking, and uniform)",
                    "Support comparisons with accurate percentages across 150 to 180 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- IELTS UNIT 3: Academic Task 1 — Processes & Maps (B2: 180-300 words) ---
    make_unit(
        level="B2",
        order=4,
        unit_id="ielts-task1-processes-maps",
        title="IELTS Task 1: Process diagrams and before/after maps",
        theme="IELTS Academic Task 1 — Passive voice sequencing and spatial transformation language",
        outcome="Write Band 7.5+ IELTS Academic Task 1 reports (180-240 words) for manufacturing processes and urban redevelopment maps.",
        grammar_focus=["passive-voice", "prepositions", "connectors", "cohesion"],
        vocabulary=["subsequently", "extracted", "conveyed", "filtrate", "demolished", "converted into", "pedestrianized", "adjacent to"],
        lessons=[
            make_lesson(
                level="B2",
                lesson_id="ielts-task1-processes-maps-1",
                title="Describing man-made processes with present simple passive and sequencers",
                markdown=(
                    "### Mastering Process Diagrams: Present Simple Passive + Stage Grouping\n"
                    "In a manufacturing or recycling diagram, the focus is on **what happens to the material**, not who operates the machine. "
                    "Use the **present simple passive** (`is harvested`, `are crushed`, `is subsequently heated`) and divide the Overview into **total stages + where the cycle begins and ends**."
                ),
                model_text=(
                    "The diagram illustrates the eight-stage industrial process by which discarded glass bottles are collected, purified, and remanufactured into new beverage containers.\n\n"
                    "Overall, the recycling loop is a continuous, cyclical process that can be divided into three main phases: collection and sorting, mechanical crushing and high-temperature melting, and automated molding into finished bottles.\n\n"
                    "In the initial phase, used glass containers are deposited by consumers into neighborhood recycling bins and subsequently transported by collection trucks to a centralized sorting plant. "
                    "Once at the facility, the bottles are washed with high-pressure water jets to remove paper labels and surface residue before being sorted manually and optically into three color streams: clear, green, and brown.\n\n"
                    "During the second phase, the sorted glass is fed into a mechanical crusher, where it is pulverized"
                    " into small fragments known as cullet. "
                    "This crushed cullet is then mixed with a small proportion of raw silica sand and heated inside a furnace at 1,500 degrees Celsius until it forms molten glass. "
                    "In the final stage, the molten liquid is poured into automated air-injected molds, cooled gradually on a conveyor belt, and inspected for structural defects before being dispatched to beverage companies for refilling."
                ),
                warmups=[
                    w("choose", "Why do process reports primarily use the present simple passive ('are washed', 'is heated') rather than active past tense?", ["Because a process diagram shows a repeatable procedure focused on the material itself.", "Because industrial machines took place in the 19th century.", "Because active verbs are banned in English."], "Because a process diagram shows a repeatable procedure focused on the material itself.", "Present simple passive keeps the material ('the glass', 'the mixture') as the grammatical topic across stages."),
                    w("gap-fill", "Combine two stages with a preposition + passive gerund: 'The bottles are washed with water jets ___ sorted by color.'", ["before being", "before be", "after been"], "before being", "'before being + past participle' ('before being sorted') links two passive stages smoothly."),
                    w("fix-the-error", "Fix the passive verb agreement: 'The crushed glass fragments is heated in a furnace.'", ["The crushed glass fragments are heated in a furnace.", "The crushed glass fragments is heated in a furnace.", "The crushed glass fragments been heated in a furnace."], "The crushed glass fragments are heated in a furnace.", "Plural 'fragments' requires 'are heated'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Academic Task 1 (180-240 words): A process diagram shows the 7 stages of producing freeze-dried instant coffee from raw coffee beans: (1) Harvesting & sun-drying beans, (2) Roasting at 200°C & grinding into coarse powder, (3) Dissolving in hot water to extract liquid coffee concentrate, (4) Freezing the concentrate to -45°C on a belt, (5) Milling the frozen slab into granules, (6) Sublimating ice in a vacuum chamber, and (7) Sealing dry granules in airtight jars. Write a complete Band 7.5+ process report.",
                scaffold="outline",
                frames=[],
                word_bank=["illustrates", "divided into", "subsequently", "before being", "where it is", "molten", "conveyor belt", "dispatched"],
                min_words=180,
                max_words=260,
                checklist=[
                    "State the total number of stages and group them into 2-3 macro phases in the Overview",
                    "Use present simple passive verbs ('are roasted', 'is frozen') consistently",
                    "Include at least one 'before being + past participle' or 'where it is + past participle' structure (180-260 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="ielts-task1-processes-maps-2",
                title="Describing before-and-after maps with compass directions and transformation verbs",
                markdown=(
                    "### Map Reports: Spatial Anchoring & Transformation Verbs\n"
                    "When comparing a town or campus map across two years (e.g., 1995 vs. Today), anchor every location using **cardinal directions** "
                    "(*in the northwest corner*, *along the southern bank*, *adjacent to*) and precise **transformation verbs**:\n\n"
                    "- **Buildings**: *demolished, knocked down, replaced by, converted into, expanded*\n"
                    "- **Trees/Green space**: *cleared, felled, chopped down to make way for*\n"
                    "- **Roads/Zones**: *pedestrianized, extended, relocated*"
                ),
                model_text=(
                    "The two maps illustrate how the coastal town of Seaview transformed between 1995 and the present day.\n\n"
                    "Overall, Seaview has undergone a dramatic shift from a working fishing and agricultural settlement into a modern residential and tourist resort. "
                    "The most notable changes include the demolition of the southern fishing port to build a marina, the replacement of northern farmland with recreational facilities, and the pedestrianization of the central market street.\n\n"
                    "In 1995, the northwest quadrant of the town was occupied by open farmland and a small woodland area. "
                    "Over the intervening period, the farmland was cleared to make way for an eighteen-hole golf course, while half of the trees in the northeast were felled to construct holiday apartments and two tennis courts. "
                    "Meanwhile, the old fish market located on the western seafront was knocked down and replaced by a four-story seafood restaurant, although the historic cafe directly opposite across the road remained unchanged.\n\n"
                    "Along the southern coast, the industrial fishing docks were removed and converted into a yacht marina bordered by a landscaped boardwalk. "
                    "Finally, the main road running north-to-south through the town center was closed to motor vehicles and turned into a pedestrian-only shopping plaza, with a new bus terminal added on the eastern outskirts."
                ),
                warmups=[
                    w("choose", "Which verb phrase is specifically appropriate for removing trees or forest on a map?", ["The trees in the northeast were felled / cleared to make way for apartments.", "The trees in the northeast were demolished and renovated.", "The trees were pedestrianized into apartments."], "The trees in the northeast were felled / cleared to make way for apartments.", "Buildings are 'demolished/knocked down', whereas trees and forests are 'felled/cleared/cut down'."),
                    w("gap-fill", "Select the precise spatial phrase: 'The historic cafe ___ across the road remained unchanged.'", ["directly opposite", "in the middle of", "on top"], "directly opposite", "'directly opposite' or 'adjacent to' gives the reader exact spatial orientation."),
                    w("fix-the-error", "Fix the compass preposition: 'A new bus terminal was built in the eastern outskirts of the town.'", ["A new bus terminal was built on the eastern outskirts of the town.", "A new bus terminal was built in the eastern outskirts of the town.", "A new bus terminal was built at the eastern outskirts of the town."], "A new bus terminal was built on the eastern outskirts of the town.", "Standard collocation: 'on the outskirts of a town/city', 'in the northwest corner', 'along the southern coast'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Academic Task 1 (180-240 words): Two maps show the layout of Riverside University Library in 2005 and Today. In 2005: North side had Printed Book Shelves (west) and Print Newspapers/Magazines (east); Center had a large Manual Borrow/Return Desk; South side had Silent Individual Desks (west) and a Bookshop (east). Today: North-west Printed Shelves were reduced by half to add an Audio/Podcast Studio; North-east Newspapers were replaced by a Digital Archive Room; the central Manual Desk was removed to create an Open Collaborative Lounge; South-west Silent Desks remained unchanged; South-east Bookshop was converted into a Cafe with self-service checkout machines adjacent to the entrance. Write a complete Band 7.5+ map report.",
                scaffold="outline",
                frames=[],
                word_bank=["illustrate", "undergone", "demolition", "quadrant", "to make way for", "replaced by", "remained unchanged", "converted into"],
                min_words=180,
                max_words=260,
                checklist=[
                    "State the overall character of the transformation in the Overview",
                    "Use accurate compass directions ('in the northwest corner', 'along the southern side') and spatial prepositions",
                    "Mention both what changed ('converted into', 'replaced by') and what remained unchanged (180-260 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="ielts-task1-processes-maps-3",
                title="Checkpoint: Hybrid urban-waterfront redevelopment map report",
                markdown=(
                    "### IELTS Unit 3 Checkpoint: Complete Map & Infrastructure Report\n"
                    "Notice how the model text below uses **past simple passive** for changes between two past years (e.g., 2000 and 2020) "
                    "and **present perfect passive** (`has been transformed`) when the second map is labeled **Today / Present**."
                ),
                model_text=(
                    "The two maps compare the layout of the Harbor Industrial Precinct in 2000 with its current configuration following a major waterfront regeneration project.\n\n"
                    "Overall, the precinct has been transformed from a closed heavy-industrial dockyard into an open, mixed-use cultural and residential quarter. "
                    "While the heritage clock tower and the northern canal basin have been preserved, all former warehouses and coal storage yards have been replaced by public green spaces, housing, and transit links.\n\n"
                    "In 2000, the western side of the precinct was dominated by three timber warehouses and a fenced cargo loading bay along the riverfront. "
                    "Today, the northernmost warehouse has been renovated and converted into a contemporary art gallery, whereas the two southern warehouses were demolished to make way for six-story eco-apartments and an underground car park. "
                    "The former cargo bay directly in front of these buildings has been landscaped into a continuous riverside promenade with a dedicated cycle lane.\n\n"
                    "East of the central clock tower—which remains in its original position—a large open-air coal yard and a disused railway siding were cleared. "
                    "In their place, developers constructed a wetland park surrounded by outdoor cafes and an amphitheater. "
                    "Furthermore, access to the district has improved significantly through the addition of a pedestrian footbridge across the southern river channel and a new light-rail station on the northeastern boundary."
                ),
                warmups=[
                    w("choose", "Which verb tense is most accurate when comparing a map from '2000' with a map labeled 'Today'?", ["Past simple passive for 2000 ('was dominated') and present perfect passive for Today.", "Future simple ('will be demolished') for everything.", "Present continuous for 2000."], "Past simple passive for 2000 ('was dominated') and present perfect passive for Today.", "Present perfect passive connects past redevelopment to the 'Today' map visible now."),
                    w("gap-fill", "Select the precise noun for turning an old building into a modern facility without knocking it down: 'The northernmost warehouse has been ___ and converted into an art gallery.'", ["renovated", "erased", "evaporated"], "renovated", "When a structure's shell is kept and upgraded, it is 'renovated / refurbished and converted into...'."),
                    w("fix-the-error", "Fix the non-defining relative clause for an unchanged feature: 'East of the clock tower—that remains in its original position—the coal yard was cleared.'", ["East of the clock tower—which remains in its original position—the coal yard was cleared.", "East of the clock tower—that remains in its original position—the coal yard was cleared.", "East of the clock tower—who remains in its original position—the coal yard was cleared."], "East of the clock tower—which remains in its original position—the coal yard was cleared.", "Never use 'that' inside a parenthetical non-defining relative clause; use 'which'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Academic Task 1 Checkpoint (180-250 words): Two maps show Greenvale Town Center in 2005 and Today. In 2005, a two-lane Highway cut straight through the center from West to East; north of the highway stood an Old Bus Depot (west) and a Historic Town Hall (east); south of the highway were a Surface Car Park (west) and an Open Vegetable Market (east). Today, the Highway has been diverted into a Ring Road around the northern perimeter, and the central stretch has been pedestrianized with trees; the Old Bus Depot was demolished to build a Multi-Modal Metro & Bus Hub; the Historic Town Hall was preserved and expanded with a Glass Annex; the Surface Car Park was replaced by a Public Park & Playground; and the Open Market was converted into a Two-Story Covered Food Hall. Write a complete Band 7.5+ map report.",
                scaffold="checklist",
                frames=[],
                word_bank=["transformed", "preserved", "renovated", "demolished", "to make way for", "landscaped", "in their place", "furthermore"],
                min_words=180,
                max_words=260,
                checklist=[
                    "Summarize the shift from vehicle-heavy town center to pedestrianized hub in the Overview",
                    "Group spatial details logically (e.g., central highway & northern half vs. southern half)",
                    "Use present perfect passive and past simple passive accurately across 180 to 260 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- IELTS UNIT 4: General Training Task 1 — Letters (B1: 100-180 words) ---
    make_unit(
        level="B1",
        order=6,
        unit_id="ielts-task1-general-letters",
        title="IELTS General Training Task 1: Formal, semi-formal, and informal letters",
        theme="IELTS General Training Task 1 — Register control and covering all three prompt bullets",
        outcome="Write Band 7.5+ IELTS General Training letters (150-180 words) with flawless tone calibration and dedicated paragraphs for all three bullet points.",
        grammar_focus=["register", "tone-formality", "modal-verbs", "task-response"],
        vocabulary=["writing to express", "dissatisfaction", "rectify", "inconvenience", "delighted", "accommodate", "propose", "faithfully"],
        lessons=[
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-general-letters-1",
                title="Calibrating salutations, contractions, and sign-offs across letter types",
                markdown=(
                    "### The 3 Registers of IELTS General Training Task 1\n"
                    "Examiners grade **Tone consistency** under Task Achievement. Match your opening, grammar, and sign-off strictly:\n\n"
                    "1. **Formal** (*Dear Sir or Madam,* → no contractions → *Yours faithfully,*)\n"
                    "2. **Semi-Formal** (*Dear Mr. / Ms. [Surname],* → polite modals, no slang → *Yours sincerely,* or *Best regards,*)\n"
                    "3. **Informal** (*Dear [First Name],* / *Hi [First Name],* → natural contractions like *I'm*, *you'll* → *Best wishes,* or *Warmly,*)"
                ),
                model_text=(
                    "Dear Mr. Harrison,\n\n"
                    "I am writing to inform you that I will be away from my apartment in Unit 12B for three weeks next month, from November 4 to November 25, as I am traveling to Singapore for a company training program.\n\n"
                    "While I am abroad, my younger brother, Minh, will be staying in my flat to water my balcony plants and collect my mail. "
                    "I have already given him a spare key and explained the building's recycling and quiet-hour rules, so there will be no disruption to the neighbors. "
                    "In case you need to reach him urgently, his mobile number is 0912-345-678.\n\n"
                    "Additionally, I noticed yesterday that the rubber seal around the bathroom window is loose, allowing rainwater to drip onto the sill during heavy storms. "
                    "Since Minh works remotely from the apartment on weekdays, I would be very grateful if your maintenance technician could replace the window seal during the second week of November. "
                    "Please let me know which morning suits your schedule.\n\n"
                    "Yours sincerely,\n"
                    "Lan Anh"
                ),
                warmups=[
                    w("choose", "Which salutation and sign-off pair is strictly required for a formal IELTS letter when you do NOT know the recipient's name?", ["Dear Sir or Madam, ... Yours faithfully,", "Dear Mr. Smith, ... See ya later,", "Hey Boss, ... Yours faithfully,"], "Dear Sir or Madam, ... Yours faithfully,", "'Dear Sir or Madam,' always pairs with 'Yours faithfully,'; 'Dear Mr./Ms. [Name],' pairs with 'Yours sincerely,'."),
                    w("gap-fill", "Select the polite semi-formal request structure: 'I would be very ___ if your technician could replace the window seal.'", ["grateful", "angry", "casual"], "grateful", "'I would be very grateful if you could...' is a high-scoring semi-formal/formal request frame."),
                    w("fix-the-error", "Fix the register mismatch in a formal complaint letter to an airline: 'Dear Sir or Madam, I'm super mad because you guys lost my suitcase.'", ["Dear Sir or Madam, I am writing to report that my checked suitcase was misplaced on Flight VN214.", "Dear Sir or Madam, I'm super mad because you guys lost my suitcase.", "Yo Airline, where is my bag at?"], "Dear Sir or Madam, I am writing to report that my checked suitcase was misplaced on Flight VN214.", "Formal letters avoid contractions ('I'm') and slang ('super mad', 'you guys')."),
                ],
                genre="paragraphs",
                prompt="IELTS General Training Task 1 (150-180 words): You are going away for three weeks and a relative will stay in your rented apartment. Write a semi-formal letter to your landlord (Mr./Ms. Davis). In your letter: (1) explain why and when you will be away, (2) introduce the relative who will stay in your apartment and give their contact details, and (3) ask the landlord to arrange a minor repair while you are gone.",
                scaffold="outline",
                frames=[],
                word_bank=["inform you", "traveling", "spare key", "disruption", "in case", "additionally", "grateful if", "Yours sincerely"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Open with 'Dear Mr./Ms. [Surname],' and close with 'Yours sincerely,'",
                    "Dedicate one short paragraph to each of the three prompt bullet points",
                    "Maintain a polite, semi-formal tone without slang (150-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-general-letters-2",
                title="Expanding all three prompt bullets evenly in an informal letter",
                markdown=(
                    "### Avoiding the 'Bullet 3 Rush' in General Training Task 1\n"
                    "Many test-takers write 120 words on Bullet 1 and only one rushed sentence on Bullet 3—which caps Task Achievement at Band 6.0. "
                    "Give **each of the three prompt bullets its own balanced 40-to-55-word paragraph** with concrete, realistic details."
                ),
                model_text=(
                    "Hi Sarah,\n\n"
                    "It was wonderful to hear that you're finally taking a week off in December! "
                    "If you're looking for a peaceful coastal escape without tourist crowds, you should definitely spend a few days on Phu Quy Island, where I went with my college friends last spring.\n\n"
                    "The island is famous for its crystal-clear lagoons and dramatic volcanic cliffs. "
                    "You can rent a small electric scooter for just a few dollars a day and ride along the coast road at sunrise, when the fishing boats return to the harbor. "
                    "In the afternoon, I'd recommend snorkeling over the coral reefs at Bai Nho beach and eating grilled seafood right by the lighthouse.\n\n"
                    "To get the best experience, book a family-run homestay in Tam Thanh village rather than a large hotel near the ferry pier. "
                    "Not only are the village homestays much quieter at night, but the hosts also cook fresh home-style breakfasts and can arrange a small wooden boat to take you to the nearby islets.\n\n"
                    "Have a fantastic trip, and send me photos!\n\n"
                    "Warm wishes,\n"
                    "Minh"
                ),
                warmups=[
                    w("choose", "Why are contractions like 'you're' and 'I'd recommend' encouraged in an IELTS letter to a close friend?", ["They demonstrate natural informal register control required for letters to friends.", "They are grammatical mistakes that lower your score.", "They are only used in academic reports."], "They demonstrate natural informal register control required for letters to friends.", "In an informal letter to a friend, using contractions and warm openings shows Band 7+ register awareness."),
                    w("gap-fill", "Complete the inverted emphasis structure in paragraph three: 'Not only ___ the village homestays quieter, but the hosts also cook fresh breakfasts.'", ["are", "is", "they are"], "are", "After 'Not only' at the start of a clause, invert the verb and subject ('are the village homestays')."),
                    w("fix-the-error", "Fix the verb form after 'recommend': 'I'd recommend to snorkel over the coral reefs.'", ["I'd recommend snorkeling over the coral reefs.", "I'd recommend to snorkel over the coral reefs.", "I'd recommend snorkel over the coral reefs."], "I'd recommend snorkeling over the coral reefs.", "When no person object follows 'recommend', use the '-ing' gerund ('recommend snorkeling')."),
                ],
                genre="paragraphs",
                prompt="IELTS General Training Task 1 (150-180 words): An English-speaking friend wants to spend a one-week holiday in your country and has asked for your advice. Write an informal letter to your friend. In your letter: (1) recommend one specific town or region to visit, (2) describe two or three activities they can do there, and (3) give advice on where to stay and why.",
                scaffold="outline",
                frames=[],
                word_bank=["wonderful to hear", "peaceful", "famous for", "sunrise", "I'd recommend", "homestay", "Not only", "Warm wishes"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Use a warm informal greeting, natural contractions, and a friendly sign-off",
                    "Develop all three bullet points into three distinct, well-balanced paragraphs",
                    "Include at least one 'I'd recommend + verb-ing' or 'Not only..., but... also' structure (150-180 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B1",
                lesson_id="ielts-task1-general-letters-3",
                title="Checkpoint: Formal complaint and resolution letter",
                markdown=(
                    "### IELTS Unit 4 Checkpoint: Formal Complaint Letter (`Dear Sir or Madam,`)\n"
                    "Write a controlled, authoritative formal letter with zero contractions, a clear statement of purpose, specific factual details of the service failure, and a firm, reasonable resolution request."
                ),
                model_text=(
                    "Dear Sir or Madam,\n\n"
                    "I am writing to express my dissatisfaction with the technical arrangements at the Rosewood Conference Hall, which my company booked on October 10 for a forty-person regional training seminar (Booking Reference #RW-904).\n\n"
                    "When confirming our reservation two weeks prior to the event, we paid an additional surcharge for the executive audiovisual package, including a ceiling projector and two wireless microphones. "
                    "However, upon arriving at 8:00 AM on the morning of the seminar, we discovered that the main projector bulb was burned out and no on-site technician was available until 10:30 AM. "
                    "As a result, our keynote speaker had to present for over two hours without visual slides, and the backup room microphone cut out repeatedly during the afternoon Q&A session.\n\n"
                    "Given that these equipment failures disrupted a critical client-facing event, I request a full refund of the $350 audiovisual surcharge and a twenty percent credit toward our invoice total. "
                    "I have attached copies of our signed contract and receipt, and I look forward to receiving your written confirmation within seven business days.\n\n"
                    "Yours faithfully,\n"
                    "Quang Tran"
                ),
                warmups=[
                    w("choose", "What makes the complaint in paragraph two persuasive and professional rather than emotional?", ["It cites exact times, specific equipment paid for, and the concrete impact on the keynote speaker.", "It uses all-caps exclamation marks to insult the hotel staff.", "It forgets to mention what went wrong."], "It cites exact times, specific equipment paid for, and the concrete impact on the keynote speaker.", "Factual specificity (times, reference numbers, exact equipment) gives a formal complaint weight."),
                    w("gap-fill", "Select the formal causal conjunction at the start of paragraph three: '___ that these equipment failures disrupted our event, I request a full refund of the surcharge.'", ["Given", "Because of", "Although"], "Given", "'Given that + [clause], I request...' is an authoritative formal transition."),
                    w("fix-the-error", "Fix the preposition phrase for prior timing: 'When confirming our booking two weeks prior the event, we paid a surcharge.'", ["When confirming our booking two weeks prior to the event, we paid a surcharge.", "When confirming our booking two weeks prior the event, we paid a surcharge.", "When confirming our booking two weeks prior at the event, we paid a surcharge."], "When confirming our booking two weeks prior to the event, we paid a surcharge.", "Always include 'to' in 'prior to [an event/date]'."),
                ],
                genre="paragraphs",
                prompt="IELTS General Training Task 1 Checkpoint (150-180 words): You recently organized a full-day company workshop at a local hotel, but several facilities you paid for did not work properly. Write a formal letter to the hotel manager ('Dear Sir or Madam,'). In your letter: (1) state the date, event details, and purpose of your letter, (2) explain the specific problems that occurred and how they affected your attendees, and (3) state what compensation or action you expect the hotel to take.",
                scaffold="checklist",
                frames=[],
                word_bank=["dissatisfaction", "Booking Reference", "prior to", "surcharge", "upon arriving", "Given that", "refund", "Yours faithfully"],
                min_words=150,
                max_words=180,
                checklist=[
                    "Open with 'Dear Sir or Madam,' and close with 'Yours faithfully,' with zero contractions",
                    "Cover all three prompt bullets in three clear, factual paragraphs",
                    "Specify a concrete refund or resolution request and timeframe (150-180 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
]


# ============================================================================
# PART 5: IELTS WRITING WORKSPACE (Units 5 to 8: Task 2 Essays) & VALIDATOR
# ============================================================================

IELTS_UNITS.extend([
    # --- IELTS UNIT 5: Task 2 — Opinion (Agree/Disagree) Essays (B2: 180-300 words) ---
    make_unit(
        level="B2",
        order=5,
        unit_id="ielts-task2-opinion-essays",
        title="IELTS Task 2: Opinion (To what extent do you agree or disagree) essays",
        theme="IELTS Task 2 — Thesis-led introductions, clear position, and PEEL body paragraphs",
        outcome="Write Band 7.5+ IELTS Task 2 Opinion essays (250-300 words) with an unmistakable position throughout and fully extended PEEL paragraphs.",
        grammar_focus=["task-response", "paragraphing", "cohesion", "conditionals"],
        vocabulary=["contend", "compelling", "disproportionately", "subsidize", "prerequisite", "sustainable", "invariably", "ultimately"],
        lessons=[
            make_lesson(
                level="B2",
                lesson_id="ielts-task2-opinion-essays-1",
                title="Taking a clear, qualified position in the 2-sentence introduction",
                markdown=(
                    "### Avoiding the 'Fence-Sitting' Trap in Opinion Essays\n"
                    "When an IELTS Task 2 prompt asks *To what extent do you agree or disagree?*, never write a vague introduction like "
                    "*This essay will discuss both sides and give my opinion at the end.* "
                    "To score **Band 7+ in Task Response**, state your exact position in **Sentence 2 of your introduction**:\n\n"
                    "- **Sentence 1 (Paraphrase)**: Reword the prompt's claim in your own vocabulary.\n"
                    "- **Sentence 2 (Thesis & Blueprint)**: `While I acknowledge that [concession], I firmly contend that [your core position] because [Reason 1] and [Reason 2].`"
                ),
                model_text=(
                    "It is often argued that governments should invest their entire public-health budget in preventive lifestyle education rather than hospital treatment. "
                    "While I agree that expanding preventive campaigns is essential to curb chronic disease, I firmly contend that states must maintain robust funding for acute clinical care because accidents and genetic conditions cannot be prevented through lifestyle choices alone.\n\n"
                    "On the one hand, channeling a substantial share of healthcare funds into public nutrition, vaccination, and anti-smoking initiatives yields massive long-term savings. "
                    "A large proportion of modern hospital admissions—including type-two diabetes, hypertension, and smoking-related lung disease—stem directly from modifiable daily habits. "
                    "When municipalities subsidize community sports centers, mandate clear sugar labeling on beverages, and offer free annual blood-pressure screenings, fewer citizens require costly intensive-care beds decades later.\n\n"
                    "Nevertheless, neglecting hospital infrastructure in favor of prevention alone would leave millions of citizens dangerously unprotected. "
                    "Even the healthiest population faces road traffic collisions, complicated childbirths, infectious outbreaks, and hereditary cancers that require trained surgeons, diagnostic scanners, and emergency wards. "
                    "Moreover, patients already living with advanced illnesses cannot simply be told to eat better; they depend on immediate medical intervention to survive. "
                    "In conclusion, although preventive education reduces future strain on medical systems, governments must balance it with well-funded hospitals so every citizen receives timely life-saving care."
                ),
                warmups=[
                    w("choose", "Why does a 'qualified agreement' thesis ('While I agree that X is vital, I contend that Y must also be funded because...') score so well in IELTS Task 2?", ["It states a crystal-clear position from the start while allowing two well-focused body paragraphs.", "It hides the writer's opinion so the examiner has to guess.", "It uses memorized clichés from the internet."], "It states a crystal-clear position from the start while allowing two well-focused body paragraphs.", "A qualified position gives you a clear stance across the whole essay and natural topics for Body 1 and Body 2."),
                    w("gap-fill", "Select the precise verb meaning 'arise or result from': 'Many modern hospital admissions ___ directly from modifiable daily habits.'", ["stem", "root", "branch"], "stem", "'stem from [a cause]' is a natural Band 7.5+ verb phrase for cause and effect."),
                    w("fix-the-error", "Fix the verb form after 'in favor of': 'Neglecting hospitals in favor of prevent alone would be dangerous.'", ["Neglecting hospitals in favor of prevention alone would be dangerous.", "Neglecting hospitals in favor of prevent alone would be dangerous.", "Neglecting hospitals in favor of to prevent alone would be dangerous."], "Neglecting hospitals in favor of prevention alone would be dangerous.", "After the prepositional phrase 'in favor of', use a noun ('prevention') or gerund ('preventing')."),
                ],
                genre="formal correspondence",
                prompt="IELTS Writing Task 2 (250-300 words): 'Some people believe that universities should only fund practical subjects like engineering, medicine, and technology, and stop funding arts and humanities courses. To what extent do you agree or disagree?' Write a 3- or 4-paragraph essay with a clear qualified thesis in your introduction.",
                scaffold="outline",
                frames=[],
                word_bank=["it is often argued", "While I acknowledge", "firmly contend", "stem directly from", "subsidize", "nevertheless", "moreover", "in conclusion"],
                min_words=240,
                max_words=300,
                checklist=[
                    "Paraphrase the prompt and state a clear, qualified thesis in your opening paragraph",
                    "Develop one core reason per body paragraph with concrete examples",
                    "Restate your position in the conclusion without introducing new arguments (240-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="ielts-task2-opinion-essays-2",
                title="Extending body paragraphs with single-idea depth instead of shopping lists",
                markdown=(
                    "### Depth Over Breadth: Avoiding the 'Three Undeveloped Ideas' Trap\n"
                    "Band 6.0 writers cram three separate ideas (*First..., Second..., Third...*) into a single 80-word body paragraph, leaving every point superficial. "
                    "Band 7.5+ writers build each body paragraph around **one overarching argument** and unpack it across 4–5 sentences:\n\n"
                    "1. **Topic Sentence**: Clear argument.\n"
                    "2. **Mechanism (`This is because...` / `When...`)**: Explain how it works in practice.\n"
                    "3. **Concrete Illustration (`For example,...`)**: Real-world policy, workplace, or educational scenario.\n"
                    "4. **Consequence (`Consequently,...`)**: Tie back to the prompt."
                ),
                model_text=(
                    "Some urban planners argue that levying congestion charges on private cars entering city centers is the most effective way to reduce traffic. "
                    "I strongly agree with this view, provided that municipal authorities reinvest the resulting revenue directly into high-frequency public transport.\n\n"
                    "The primary reason congestion pricing succeeds is that it attaches an immediate, visible financial cost to solo rush-hour driving. "
                    "When road access is completely free at the point of use, commuters naturally choose the convenience of a private car even for short three-kilometer journeys, ignoring the collective delay they impose on thousands of bus passengers. "
                    "For example, after cities such as Singapore and Stockholm introduced automated electronic road pricing during peak morning hours, discretionary car trips dropped by nearly twenty percent within the first year, and average bus speeds rose noticeably. "
                    "Consequently, pricing scarce road space encourages drivers to carpool, shift non-urgent errands to off-peak hours, or switch to rail.\n\n"
                    "However, for such a charge to remain socially fair, every dollar collected must be ring-fenced to expand affordable transit alternatives. "
                    "If a city penalizes drivers without adding suburban feeder buses or metro carriages, the fee merely acts as a regressive tax on working commuters who have no other way to reach their jobs. "
                    "In conclusion, peak-hour road pricing is a powerful tool for clearing urban gridlock when paired with immediate reinvestment in public transit."
                ),
                warmups=[
                    w("choose", "Why does a single fully unpacked argument per body paragraph outscore a 'First, Second, Third' shopping list in IELTS Task 2?", ["IELTS rubrics reward fully extended, well-supported ideas over brief unproved lists.", "Examiners are not allowed to read the word 'First'.", "Shopping lists use too many periods."], "IELTS rubrics reward fully extended, well-supported ideas over brief unproved lists.", "Unpacking the 'how', 'for example', and 'consequently' of one strong point proves Band 7.5+ development."),
                    w("gap-fill", "Select the conditional conjunction meaning 'on the condition that': 'I agree with this view, ___ that cities reinvest the revenue into buses.'", ["provided", "unless", "despite"], "provided", "'provided that' or 'providing that' introduces a precise policy condition."),
                    w("fix-the-error", "Fix the adjective vs. adverb error: 'Average bus speeds rose noticeable after the charge launched.'", ["Average bus speeds rose noticeably after the charge launched.", "Average bus speeds rose noticeable after the charge launched.", "Average bus speeds noticeable rose after the charge."], "Average bus speeds rose noticeably after the charge launched.", "Use the adverb 'noticeably' to modify the action verb 'rose'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Writing Task 2 (250-300 words): 'Some people think that imposing a higher tax on sugary drinks and fast food is the best way to solve rising public health problems. To what extent do you agree or disagree?' Write an essay where each body paragraph develops one deep argument using Topic Sentence -> Mechanism -> Example -> Consequence.",
                scaffold="outline",
                frames=[],
                word_bank=["provided that", "primary reason", "at the point of use", "for example", "consequently", "socially fair", "regressive", "in conclusion"],
                min_words=240,
                max_words=300,
                checklist=[
                    "State a clear position using 'provided that' or a qualified thesis in paragraph one",
                    "Develop one unified argument per body paragraph (Topic -> Mechanism -> Example -> Consequence)",
                    "Keep total length between 240 and 300 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="ielts-task2-opinion-essays-3",
                title="Checkpoint: Full IELTS Task 2 Opinion essay",
                markdown=(
                    "### IELTS Unit 5 Checkpoint: Complete Task 2 Opinion Essay\n"
                    "Demonstrate a clear position from introduction to conclusion, two deeply developed body paragraphs, and accurate conditional and relative clauses."
                ),
                model_text=(
                    "Many educators believe that secondary schools should make community service or unpaid volunteering a mandatory requirement for graduation. "
                    "While compulsory programmes can sometimes feel burdensome during exam seasons, I strongly agree that structured community service should be part of the high-school curriculum because it cultivates civic empathy and exposes teenagers to practical workplace responsibilities.\n\n"
                    "First and foremost, participating in local community projects helps adolescents look beyond their immediate academic pressure and understand diverse social realities. "
                    "Modern secondary education often isolates students inside competitive exam tracks, leaving them with little awareness of the challenges faced by elderly neighbors, disabled residents, or low-income families. "
                    "When a sixteen-year-old spends two hours a week tutoring younger children at a neighborhood center or assisting at a community kitchen, abstract lessons about citizenship become tangible human relationships. "
                    "As a result, students graduate with stronger social empathy and a lasting sense of civic responsibility.\n\n"
                    "Equally important, well-designed volunteering placements allow teenagers to develop foundational soft skills before entering university or the labor market. "
                    "Coordinating a park clean-up or organizing charity book donations requires reliability, teamwork, and clear communication with adults outside a teenager's family circle. "
                    "Provided that schools keep the required hours reasonable—such as twenty hours per academic year—and allow students to choose causes that match their interests, volunteering enriches rather than disrupts academic study. "
                    "In conclusion, integrating manageable community service into secondary education prepares young people to become both capable professionals and compassionate citizens."
                ),
                warmups=[
                    w("choose", "How does paragraph three address the potential counter-argument against mandatory volunteering?", ["It embeds a practical safeguard ('Provided that hours stay reasonable...') to avoid overload.", "It says exams do not matter at all.", "It contradicts the thesis statement."], "It embeds a practical safeguard ('Provided that hours stay reasonable...') to avoid overload.", "Embedding a realistic safeguard shows Band 7.5+ maturity without losing your clear stance."),
                    w("gap-fill", "Select the precise verb meaning 'develop or nurture a quality gradually': 'Structured volunteering ___ civic empathy in teenagers.'", ["cultivates", "demolishes", "postpones"], "cultivates", "'cultivate empathy / skills / habits' is an idiomatic C1/Band 8 collocation."),
                    w("fix-the-error", "Fix the verb agreement after 'requires': 'Organizing book donations require reliability and teamwork.'", ["Organizing book donations requires reliability and teamwork.", "Organizing book donations require reliability and teamwork.", "Organize book donations requires reliability and teamwork."], "Organizing book donations requires reliability and teamwork.", "The singular gerund subject 'Organizing book donations' takes 'requires'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Writing Task 2 Checkpoint (250-300 words): 'Some people believe that all university students should be required to complete a semester-long workplace internship before they can graduate. To what extent do you agree or disagree?' Write a complete Band 7.5+ Opinion essay.",
                scaffold="checklist",
                frames=[],
                word_bank=["mandatory", "burdensome", "cultivates", "first and foremost", "tangible", "equally important", "provided that", "compassionate"],
                min_words=240,
                max_words=300,
                checklist=[
                    "State a clear position in your introduction and maintain it consistently",
                    "Extend each body paragraph with mechanism, concrete illustration, and consequence",
                    "Include at least one 'Provided that...' or gerund-subject clause across 240 to 300 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- IELTS UNIT 6: Task 2 — Discussion & Pros/Cons Essays (B2: 180-300 words) ---
    make_unit(
        level="B2",
        order=6,
        unit_id="ielts-task2-discussion-essays",
        title="IELTS Task 2: Discussion (Both views and opinion) and Outweigh essays",
        theme="IELTS Task 2 — Impartial attribution of opposing views vs. explicit authorial voice",
        outcome="Write Band 7.5+ IELTS Discussion and Advantages/Disadvantages essays (250-300 words) that separate third-party views from your own opinion.",
        grammar_focus=["task-response", "cohesion", "register", "connectors"],
        vocabulary=["proponents", "advocates", "maintain that", "conversely", "contend", "outweigh", "short-sighted", "indispensable"],
        lessons=[
            make_lesson(
                level="B2",
                lesson_id="ielts-task2-discussion-essays-1",
                title="Distinguishing third-party attribution from your own authorial voice",
                markdown=(
                    "### The #1 Scoring Rule for 'Discuss Both Views and Give Your Opinion'\n"
                    "In a Discussion essay, examiners check two distinct things:\n"
                    "1. Did you discuss **both** views fairly?\n"
                    "2. Is **your own opinion** unmistakably separate from the views you attribute to others?\n\n"
                    "- **Body 1 (View A — The side you disagree with)**: Use third-person attribution (`Advocates of X argue that...`, `From this perspective,...`).\n"
                    "- **Body 2 (View B + Your Opinion)**: Signal the shift explicitly (`However, I side with those who contend that...`, `In my view,...`)."
                ),
                model_text=(
                    "While some people argue that international sporting events such as the Olympics and the World Cup are a wasteful extravagance for host nations, others believe they bring lasting economic and cultural rewards. "
                    "Although poorly planned tournaments can leave cities with underused stadiums, I contend that well-managed global events deliver long-term infrastructure and tourism benefits that justify the investment.\n\n"
                    "Critics of hosting mega-events point out that constructing specialized arenas and athlete villages requires billions of dollars in public funds that could otherwise support schools, hospitals, or social housing. "
                    "In several past host cities, bespoke velodromes and aquatic centers fell into disrepair within a few years of the closing ceremony, saddling local taxpayers with decades of maintenance debt. "
                    "From a purely short-term accounting perspective, ticket and broadcast revenues rarely cover these initial capital outlays.\n\n"
                    "However, I share the view that strategic host cities can use international tournaments as a catalyst to accelerate essential urban transit and regeneration projects. "
                    "When cities such as Barcelona, London, or Tokyo prepared for global games, they directed the bulk of their budgets into permanent airport rail links, revitalized waterfronts, and modular athlete housing that was subsequently converted into thousands of residential apartments. "
                    "Furthermore, global media coverage places the host country on the world tourism map for decades afterward. "
                    "In conclusion, while vanity stadiums are indeed wasteful, hosting major sporting events is worthwhile when governments design every facility for post-tournament public use."
                ),
                warmups=[
                    w("choose", "Why do many candidates get stuck at Band 6.0 on 'Discuss both views and give your opinion' essays?", ["They use third-person phrases in both body paragraphs and hide their opinion until the end.", "They write 275 words.", "They use paragraphs."], "They use third-person phrases in both body paragraphs and hide their opinion until the end.", "To score Band 7+ in Task Response, your own opinion must be clear in the thesis, developed in the body, and restated in the conclusion."),
                    w("gap-fill", "Select the voice-shift phrase that aligns your opinion with View B at the start of Body Paragraph 2: 'However, I ___ the view that strategic host cities can use tournaments as a catalyst.'", ["share", "borrow", "refuse"], "share", "'However, I share the view that...' or 'However, I side with those who argue that...' makes your voice unmistakable."),
                    w("fix-the-error", "Fix the participle clause showing result: '...fell into disrepair, saddled local taxpayers with maintenance debt.'", ["...fell into disrepair, saddling local taxpayers with maintenance debt.", "...fell into disrepair, saddled local taxpayers with maintenance debt.", "...fell into disrepair, to saddle local taxpayers with maintenance debt."], "...fell into disrepair, saddling local taxpayers with maintenance debt.", "Use the active present participle (', saddling...') to express the consequence of the preceding clause."),
                ],
                genre="formal correspondence",
                prompt="IELTS Writing Task 2 (250-300 words): 'Some people believe that employees should stay in the same company for their entire career, while others think changing jobs frequently is better for professional growth. Discuss both these views and give your own opinion.' Write a complete essay clearly separating third-party attribution from your own stance.",
                scaffold="outline",
                frames=[],
                word_bank=["extravagance", "critics", "point out that", "saddling", "However, I share the view", "catalyst", "subsequently", "in conclusion"],
                min_words=240,
                max_words=300,
                checklist=[
                    "State both views and your own clear opinion in the introduction",
                    "Use third-person attribution ('Proponents of X argue...') in Body 1",
                    "Signal your own stance explicitly ('However, I share the view that...') in Body 2 and the conclusion (240-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="ielts-task2-discussion-essays-2",
                title="Do the advantages outweigh the disadvantages? Proving net weight",
                markdown=(
                    "### 'Outweigh' Essays: Why Listing 1 Pro and 1 Con Is Not Enough\n"
                    "When a prompt asks *Do the advantages of X outweigh the disadvantages?*, you cannot just list one benefit and one drawback and stop. "
                    "You must **evaluate why the drawbacks are manageable or temporary**, whereas **the advantages are systemic and transformative**."
                ),
                model_text=(
                    "In many countries, physical cash is rapidly being replaced by mobile wallets, contactless cards, and instant QR-code transfers. "
                    "Although a cashless economy introduces legitimate privacy and accessibility concerns, I believe the advantages far outweigh the disadvantages because digital payments reduce transaction crime, streamline small-business accounting, and can be designed to include vulnerable citizens.\n\n"
                    "Admittedly, transitioning away from physical banknotes creates two real challenges that governments must manage carefully. "
                    "First, elderly citizens in rural areas who lack smartphones or digital literacy can feel excluded when shops refuse coins and notes. "
                    "Second, complete reliance on banking servers means that a temporary power outage or cyberattack can briefly disrupt everyday purchases. "
                    "However, both drawbacks are operational hurdles rather than permanent flaws: banks can provide simple offline-capable payment cards, and municipal regulations can require essential pharmacies and grocery stores to keep accepting cash.\n\n"
                    "By contrast, the economic and social benefits of digital payments are transformative and enduring. "
                    "For small street vendors and independent retailers, instant QR transfers eliminate the risk of counterfeit bills, nighttime cash robberies, and time-consuming trips to deposit physical notes at a bank branch. "
                    "Moreover, transparent digital records help micro-businesses prove their monthly revenue so they can qualify for fair low-interest bank loans instead of predatory informal credit. "
                    "In conclusion, because the risks of digital payments are easily mitigated through sensible safeguards, their economic advantages clearly prevail."
                ),
                warmups=[
                    w("choose", "How does the end of Body Paragraph 1 prove that the disadvantages do NOT outweigh the advantages?", ["It shows that both drawbacks are manageable operational hurdles with practical policy fixes.", "It pretends that power outages never happen.", "It says elderly people do not buy groceries."], "It shows that both drawbacks are manageable operational hurdles with practical policy fixes.", "Explicitly minimizing the weight of the drawbacks at the end of Body 1 sets up your winning side in Body 2."),
                    w("gap-fill", "Select the verb meaning 'win out or prove stronger in the end': 'In conclusion, the economic advantages clearly ___.'", ["prevail", "surrender", "vanish"], "prevail", "'prevail' or 'far outweigh the drawbacks' delivers a decisive final evaluation."),
                    w("fix-the-error", "Fix the plural/uncountable agreement: 'Physical cash are rapidly being replaced by mobile wallets.'", ["Physical cash is rapidly being replaced by mobile wallets.", "Physical cash are rapidly being replaced by mobile wallets.", "Physical cashes are rapidly being replaced by mobile wallets."], "Physical cash is rapidly being replaced by mobile wallets.", "'Cash' is an uncountable singular noun and takes 'is'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Writing Task 2 (250-300 words): 'More and more students are choosing to study at universities in a foreign country rather than in their homeland. Do the advantages of studying abroad outweigh the disadvantages?' Write an Outweigh essay that explicitly evaluates why one side carries greater weight.",
                scaffold="outline",
                frames=[],
                word_bank=["far outweigh", "Admittedly", "excluded", "operational hurdles", "By contrast", "transformative", "mitigated", "prevail"],
                min_words=240,
                max_words=300,
                checklist=[
                    "State clearly in your thesis that the advantages far outweigh the disadvantages (or vice versa)",
                    "Acknowledge two drawbacks in Body 1 and explain why they are manageable or temporary",
                    "Demonstrate why the benefits in Body 2 are deeper and more lasting (240-300 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="B2",
                lesson_id="ielts-task2-discussion-essays-3",
                title="Checkpoint: Full Discussion & Opinion essay under exam constraints",
                markdown=(
                    "### IELTS Unit 6 Checkpoint: Complete Discussion Essay\n"
                    "Demonstrate balanced examination of both perspectives, unmistakable voice separation, and a cohesive synthesis."
                ),
                model_text=(
                    "While some economists argue that governments should prioritize rapid economic growth above all else, others contend that environmental protection must take precedence even if it slows industrial expansion. "
                    "Although rising incomes are vital for lifting populations out of poverty, I believe that safeguarding ecological systems must be the primary policy boundary because environmental collapse ultimately destroys the foundation of economic prosperity itself.\n\n"
                    "Advocates of growth-first policies emphasize that tax revenues generated by manufacturing, construction, and exports fund the public infrastructure that developing societies urgently need. "
                    "Without robust industrial expansion, governments struggle to build rural hospitals, modernize grids, or create stable employment for millions of young graduates. "
                    "From this viewpoint, strict emissions caps or land-use bans are luxuries that lower-income nations can only afford after achieving high per-capita wealth.\n\n"
                    "However, I side with environmental scientists and economists who point out that treating nature as an expendable input is economically self-defeating. "
                    "When unregulated factories pollute river basins or clear coastal mangroves, the immediate profits earned by a handful of corporations are dwarfed by the long-term public cost of agricultural crop failures, storm damage, and respiratory illness. "
                    "In Vietnam's Mekong Delta, for instance, saltwater intrusion and land subsidence already threaten the livelihoods of millions of farming families. "
                    "Furthermore, modern green technologies—such as solar microgrids and circular manufacturing—now allow nations to expand employment without repeating twentieth-century pollution. "
                    "In conclusion, rather than sacrificing the environment for short-term GDP gains, governments must embed ecological limits at the heart of economic planning."
                ),
                warmups=[
                    w("gap-fill", "Select the passive comparison phrase meaning 'made to look tiny by comparison': 'Immediate corporate profits are ___ by the long-term public cost of crop failures.'", ["dwarfed", "enlarged", "celebrated"], "dwarfed", "'are dwarfed by [a much larger cost]' is a high-impact Band 8 comparative structure."),
                    w("choose", "How does the model introduction establish both views AND the writer's opinion in just two sentences?", ["Sentence 1 contrasts both views, and Sentence 2 states the writer's qualified stance.", "It copies the prompt word for word.", "It waits until the last word of the essay to mention the environment."], "Sentence 1 contrasts both views, and Sentence 2 states the writer's qualified stance.", "That 2-sentence introduction blueprint works for every IELTS Discussion essay."),
                    w("fix-the-error", "Fix the adjective form after 'economically': 'Treating nature as an expendable input is economically self-defeat.'", ["Treating nature as an expendable input is economically self-defeating.", "Treating nature as an expendable input is economically self-defeat.", "Treating nature as an expendable input is economical self-defeating."], "Treating nature as an expendable input is economically self-defeating.", "Use the compound participial adjective 'self-defeating' after the adverb 'economically'."),
                ],
                genre="formal correspondence",
                prompt="IELTS Writing Task 2 Checkpoint (250-300 words): 'Some people think that the main purpose of schools is to turn children into good citizens and workers, rather than to benefit them as individuals. Discuss both these views and give your own opinion.' Write a complete Band 7.5+ Discussion essay.",
                scaffold="checklist",
                frames=[],
                word_bank=["take precedence", "Advocates of", "from this viewpoint", "However, I side with", "self-defeating", "dwarfed by", "for instance", "embed"],
                min_words=240,
                max_words=300,
                checklist=[
                    "Open with a 2-sentence introduction contrasting both views and stating your opinion",
                    "Attribute View A fairly in Body 1, then shift explicitly to your own stance in Body 2",
                    "Include a concrete example and close with a synthesized conclusion (240-300 words)",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- IELTS UNIT 7: Task 2 — Problem-Solution & Two-Part Essays (C1: 250-400 words) ---
    make_unit(
        level="C1",
        order=4,
        unit_id="ielts-task2-problem-solution",
        title="IELTS Task 2: Causes/Solutions and Two-Part Direct Question essays",
        theme="IELTS Task 2 — Specific root-cause diagnosis and paired, feasible interventions",
        outcome="Write Band 8.0 IELTS Problem-Solution and Two-Part essays (260-340 words) where specific causes map directly to targeted, multi-actor solutions.",
        grammar_focus=["task-response", "cohesion", "register", "collocation"],
        vocabulary=["stem from", "exacerbate", "prohibitive", "incentivize", "curb", "concerted", "viable", "alleviate"],
        lessons=[
            make_lesson(
                level="C1",
                lesson_id="ielts-task2-problem-solution-1",
                title="Pairing specific root causes with mirrored solutions",
                markdown=(
                    "### The 'Mirrored Cause & Solution' Blueprint\n"
                    "In a *What are the causes of this problem, and what measures can be taken to solve it?* essay, avoid listing three random causes in Body 1 and three unrelated clichés (*The government should raise awareness*) in Body 2. "
                    "Instead, select **two specific structural causes** in Body 1, and design **two mirrored solutions** in Body 2 that directly target Cause 1 and Cause 2."
                ),
                model_text=(
                    "Across many developed and rapidly industrializing nations, the average age at which young adults purchase their first home or start a family has risen sharply over the past two decades. "
                    "This demographic shift stems primarily from prohibitive urban housing costs and the rise of precarious early-career employment, both of which require coordinated housing and labor-market reforms.\n\n"
                    "Two structural pressures explain why young people are delaying major life milestones. "
                    "First, residential property prices in major employment hubs have grown three to four times faster than entry-level wages, driven by speculative real-estate investment and restrictive zoning laws that limit high-density apartment construction near transit lines. "
                    "Second, even university-educated graduates now spend their twenties navigating short-term contract roles and gig-economy work while carrying substantial educational or living debt. "
                    "Without predictable multi-year income or affordable rent, committing to a mortgage or raising children becomes financially reckless.\n\n"
                    "Addressing these twin bottlenecks requires targeted interventions that match each underlying cause. "
                    "To curb housing inflation, municipal and national governments should upzone land within walking distance of metro stations for mid-rise public-private rental housing while levying steep vacancy taxes on speculative second homes. "
                    "Simultaneously, to alleviate early-career insecurity, policymakers can incentivize employers through payroll-tax credits to convert long-term contractors into permanent staff and expand subsidized municipal childcare for working parents. "
                    "Where cities such as Vienna have combined transit-oriented social housing with stable tenant protections and universal early childhood education, young families enjoy far greater financial predictability. In conclusion, young adults delay settling down not out of personal reluctance, but because urban housing and entry-level work have grown prohibitively insecure; reforming residential zoning and labor contracts offers the surest path forward."
                ),
                warmups=[
                    w("choose", "Why does mirroring Solution 1 -> Cause 1 and Solution 2 -> Cause 2 score so highly in IELTS Coherence & Cohesion?", ["It creates tight symmetry so every proposed policy directly solves a diagnosed root cause.", "It allows the writer to repeat the exact same sentences twice.", "It avoids answering the second question in the prompt."], "It creates tight symmetry so every proposed policy directly solves a diagnosed root cause.", "Mirrored cause-and-solution architecture eliminates vague 'raise awareness' filler."),
                    w("gap-fill", "Select the C1 adjective meaning 'so high in price that it prevents people from buying': 'This shift stems from ___ urban housing costs.'", ["prohibitive", "charitable", "negligible"], "prohibitive", "'prohibitive costs / prices' is a natural Band 8 collocation."),
                    w("fix-the-error", "Fix the verb pattern after 'incentivize': 'Governments can incentivize employers converting contractors into permanent staff.'", ["Governments can incentivize employers to convert contractors into permanent staff.", "Governments can incentivize employers converting contractors into permanent staff.", "Governments can incentivize employers convert contractors into permanent staff."], "Governments can incentivize employers to convert contractors into permanent staff.", "Use 'incentivize + object + to-infinitive' ('incentivize employers to convert')."),
                ],
                genre="application letter",
                prompt="IELTS Writing Task 2 (260-340 words): 'In many cities, an increasing number of people suffer from chronic stress and burnout related to their work. What are the main causes of this trend, and what measures can employers and individuals take to address it?' Write a 4-paragraph Cause & Solution essay where your two solutions in Body 2 directly mirror your two causes in Body 1.",
                scaffold="outline",
                frames=[],
                word_bank=["stems primarily from", "prohibitive", "precarious", "structural pressures", "twin bottlenecks", "curb", "simultaneously", "alleviate"],
                min_words=250,
                max_words=350,
                checklist=[
                    "Preview both the two root causes and the policy direction in your thesis statement",
                    "Diagnose two specific structural causes in Body Paragraph 1",
                    "Propose two concrete solutions in Body Paragraph 2 that directly target Cause 1 and Cause 2 (250-350 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="ielts-task2-problem-solution-2",
                title="Answering Two-Part Direct Question essays with equal weight",
                markdown=(
                    "### Mastering Two-Part ('Direct Question') Prompts\n"
                    "Prompts that end with two separate questions—such as *(1) Why is this happening? (2) Is this a positive or negative development?*—must be answered directly in **both your thesis and your two body paragraphs**:\n\n"
                    "- **Introduction**: Paraphrase + **1 sentence answering Question 1 and Question 2 directly**.\n"
                    "- **Body 1**: Answer Question 1 thoroughly.\n"
                    "- **Body 2**: Answer Question 2 thoroughly."
                ),
                model_text=(
                    "In recent years, traditional neighborhood grocery shops and independent bookstalls have increasingly been replaced by large international retail chains and next-day e-commerce platforms. "
                    "This consolidation is driven by consumer demand for lower prices and frictionless home delivery, and while it improves household purchasing power, I view the complete disappearance of independent local retailers as a largely negative development for community life.\n\n"
                    "The primary catalyst behind the decline of small family-owned shops is the massive economies of scale enjoyed by multinational supermarkets and online marketplaces. "
                    "Because global platforms purchase inventory in bulk and operate automated regional warehouses, they can undercut independent shopkeepers by fifteen to twenty percent on everyday staples while offering thousands of product varieties under one virtual roof. "
                    "For time-poor dual-income families, ordering groceries via a smartphone app in five minutes is far more convenient than visiting three separate neighborhood stalls before closing time.\n\n"
                    "Despite these undeniable consumer conveniences, the erosion of independent street-level retail carries severe long-term social and economic costs. "
                    "Local shop owners do more than sell goods; they recirculate profits within the municipality, hire neighborhood youth, and provide informal daily social contact for elderly residents who live alone. "
                    "When a high street is hollowed out by courier warehouses and identical chain storefronts, neighborhoods lose both their distinctive cultural character and their economic resilience against corporate price hikes. "
                    "Municipalities can preserve this neighborhood vitality by offering targeted business-rate relief for ground-floor independent grocers and helping local markets build shared neighborhood delivery cooperatives. In conclusion, although economies of scale and digital convenience explain why mega-retailers dominate, cities lose vital social and economic fabric when independent merchants vanish entirely."
                ),
                warmups=[
                    w("choose", "What happens to your Task Response score if you write 200 words explaining *why* small shops are closing (Question 1) and only one sentence on *whether it is positive or negative* (Question 2)?", ["Task Response is capped at Band 6.0 when one question is developed much less than the other.", "You automatically get Band 9.0.", "Question 2 is optional in IELTS."], "Task Response is capped at Band 6.0 when one question is developed much less than the other.", "The Band 7+ descriptor requires addressing ALL parts of the prompt equally and fully."),
                    w("gap-fill", "Select the economic collocation meaning 'cost advantages gained by large production/purchasing volume': '...the massive ___ enjoyed by multinational supermarkets.'", ["economies of scale", "shortages of scale", "scales of economy"], "economies of scale", "'economies of scale' is an exact C1 economic collocation for retail and industrial essays."),
                    w("fix-the-error", "Fix the semicolon + elaboration structure: 'Local shop owners do more than sell goods, they recirculate profits within the community.'", ["Local shop owners do more than sell goods; they recirculate profits within the community.", "Local shop owners do more than sell goods, they recirculate profits within the community.", "Local shop owners do more than sell goods; because they recirculate profits."], "Local shop owners do more than sell goods; they recirculate profits within the community.", "Use a semicolon (not a comma splice) between two closely linked independent clauses."),
                ],
                genre="application letter",
                prompt="IELTS Writing Task 2 (260-340 words): 'Nowadays, many young people choose to work as self-employed freelancers or content creators rather than joining traditional companies. Why is this trend occurring? Do you think it is a positive or negative development overall?' Write a balanced 4-paragraph Two-Part essay.",
                scaffold="outline",
                frames=[],
                word_bank=["consolidation", "driven by", "catalyst", "economies of scale", "time-poor", "erosion", "hollowed out", "social fabric"],
                min_words=250,
                max_words=350,
                checklist=[
                    "Answer both Question 1 and Question 2 explicitly in your thesis statement",
                    "Dedicate Body Paragraph 1 to answering the first question ('Why?')",
                    "Dedicate Body Paragraph 2 to evaluating whether the trend is positive or negative (250-350 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="ielts-task2-problem-solution-3",
                title="Checkpoint: Two-part essay on education, technology, and youth",
                markdown=(
                    "### IELTS Unit 7 Checkpoint: Complete Band 8.0 Two-Part / Problem-Solution Essay\n"
                    "Demonstrate balanced paragraph weighting, C1 causal and policy vocabulary, and zero mechanical clichés."
                ),
                model_text=(
                    "In many countries today, fewer secondary-school students are choosing to study pure science and mathematics subjects at university. "
                    "This decline stems largely from abstract, exam-driven classroom pedagogy and the perceived financial allure of business and media careers, a trend that poses serious risks to a nation's long-term technological and healthcare capacity.\n\n"
                    "Two interconnected factors explain why teenagers turn away from foundational scientific disciplines. "
                    "First, secondary-school physics, chemistry, and calculus curricula frequently emphasize rote formula memorization for high-stakes standardized tests rather than hands-on laboratory inquiry, causing many capable students to view STEM subjects as dry and unforgiving. "
                    "Second, students see graduates in finance, digital marketing, and commercial management earning rapid entry-level salaries without enduring the grueling laboratory hours required for scientific research. "
                    "Faced with harder coursework and delayed financial rewards, pragmatic eighteen-year-olds naturally gravitate toward commercial degrees.\n\n"
                    "If left unaddressed, this talent drain will severely undermine both national innovation and public welfare over the coming decades. "
                    "Modern economies depend on domestic cohorts of chemical engineers, epidemiologists, and materials scientists to develop renewable energy grid storage, manage aging populations, and respond to emerging public-health threats. "
                    "When a country cannot train enough STEM specialists internally, its hospitals and technology firms become reliant on expensive foreign contractors, stalling homegrown research and development. "
                    "Reversing this trajectory requires modernizing secondary-school laboratories around inquiry-based climate and engineering projects while expanding national research fellowships that guarantee competitive early-career compensation for STEM graduates. In conclusion, outdated teaching methods and skewed salary incentives are driving youth away from science, and addressing both pressures is vital to safeguard future economic and medical resilience."
                ),
                warmups=[
                    w("gap-fill", "Select the C1 participle opener showing how students react to conditions: '___ with harder coursework and delayed rewards, students gravitate toward business degrees.'", ["Faced", "Facing to", "To face"], "Faced", "'Faced with [a situation], [subject]...' is a concise C1 passive participle opener."),
                    w("choose", "How does Body Paragraph 2 trace the concrete consequences of the STEM shortage?", ["It names specific scientific roles and the exact national sectors that suffer without them.", "It says 'Science is very nice and everyone likes it.'", "It switches the topic to primary-school art classes."], "It names specific scientific roles and the exact national sectors that suffer without them.", "Naming specific professions and concrete sectoral impacts turns a general claim into Band 8 analysis."),
                    w("fix-the-error", "Fix the preposition after 'gravitate': 'Pragmatic students naturally gravitate in commercial degrees.'", ["Pragmatic students naturally gravitate toward commercial degrees.", "Pragmatic students naturally gravitate in commercial degrees.", "Pragmatic students naturally gravitate at commercial degrees."], "Pragmatic students naturally gravitate toward commercial degrees.", "Standard collocation: 'gravitate toward / towards [something]'."),
                ],
                genre="application letter",
                prompt="IELTS Writing Task 2 Checkpoint (260-340 words): 'In many parts of the world, rural villages are losing their younger population as young adults move to major cities for work and study. Why is this happening, and what are the main effects on both rural communities and large cities?' Write a complete Band 8.0 Two-Part essay.",
                scaffold="checklist",
                frames=[],
                word_bank=["stems largely from", "interconnected", "rote", "Faced with", "gravitate toward", "If left unaddressed", "undermine", "reliant on"],
                min_words=250,
                max_words=350,
                checklist=[
                    "Answer both questions directly in your introduction",
                    "Give equal analytical depth to both Body Paragraph 1 (Causes) and Body Paragraph 2 (Effects)",
                    "Use C1 collocations ('Faced with...', 'If left unaddressed,...') across 250 to 350 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),

    # --- IELTS UNIT 8: Task 2 — Band 7.5 to 8.5 Polish (C1: 250-400 words) ---
    make_unit(
        level="C1",
        order=5,
        unit_id="ielts-task2-band8-polish",
        title="IELTS Task 2: Band 8.0+ lexical precision, cohesion, and syntactic variety",
        theme="IELTS Task 2 — Eliminating memorized templates and mastering Band 8+ rubric descriptors",
        outcome="Produce unassisted Band 8.0+ IELTS Task 2 essays (260-350 words) free of mechanical templates, using lexical cohesion, inversion, and C1 collocations.",
        grammar_focus=["cohesion", "collocation", "register", "relative-clauses"],
        vocabulary=["ubiquitous", "ramification", "exacerbate", "disproportionately", "indispensable", "curtail", "mitigate", "paradigm"],
        lessons=[
            make_lesson(
                level="C1",
                lesson_id="ielts-task2-band8-polish-1",
                title="Eliminating 'memorized template' penalties in Coherence and Cohesion",
                markdown=(
                    "### Why Memorized Templates Cap Your Score at Band 6.0\n"
                    "Official IELTS examiners are trained to spot and penalize memorized essay skeletons (*With the rapid development of modern society and technology, a controversial debate has arisen about...*, *Every coin has two sides*, *In a nutshell*). "
                    "Replace mechanical sentence-initial linkers with **organic lexical cohesion** (`This disparity`, `Such interventions`, `Beyond its economic toll,...`)."
                ),
                model_text=(
                    "Targeted digital advertising—powered by real-time tracking of browsing histories, location data, and purchase habits—has become the financial engine of the modern internet. "
                    "While behavioral ad targeting funds free online services and helps niche businesses reach likely buyers, I contend that its unchecked expansion erodes personal privacy and manipulates consumer behavior in ways that require strict regulatory limits.\n\n"
                    "Defenders of personalized advertising point out that ad revenue subsidizes the search engines, video platforms, and independent news sites that billions of people use without paying subscription fees. "
                    "For small artisanal brands or local service providers, algorithmic targeting also levels the commercial playing field, allowing them to show advertisements only to nearby users with relevant interests rather than buying expensive television airtime.\n\n"
                    "Beyond these commercial conveniences, however, pervasive data harvesting inflicts deep social and psychological harm. "
                    "To maximize click-through rates, ad networks assemble granular profiles that infer a user's financial anxieties, health vulnerabilities, and political leanings without meaningful consent. "
                    "These behavioral profiles enable predatory lenders, gambling apps, and impulsive fast-fashion retailers to target susceptible individuals at moments of weakness. "
                    "Even more troubling, when social-media algorithms optimize solely for advertising engagement, they amplify sensationalist and polarizing content that keeps users scrolling longer. "
                    "Contextual advertising—which matches ads to the topic of the webpage currently being read rather than a user's private life history—already proves that publishers can generate healthy revenue without invasive surveillance. In conclusion, although digital advertising supports accessible online content, governments must prohibit non-consensual behavioral tracking so commercial profit does not come at the expense of citizen autonomy and mental well-being."
                ),
                warmups=[
                    w("choose", "Which opening sentence avoids memorized IELTS clichés and engages directly with the prompt topic?", ["Targeted digital advertising—powered by real-time tracking—funds much of the modern internet.", "Nowadays, with rapid development, advertising is a hot topic where every coin has two sides.", "In this essay I will embark upon a journey to discuss the pros and cons of ads."], "Targeted digital advertising—powered by real-time tracking—funds much of the modern internet.", "Jumping straight into the specific mechanism of the topic proves authentic C1/Band 8 fluency."),
                    w("gap-fill", "Replace 'Secondly, Moreover,' at the start of the rebuttal paragraph with an organic bridge: '___ these commercial conveniences, however, pervasive data harvesting inflicts deep harm.'", ["Beyond", "In a nutshell", "Every coin"], "Beyond", "'Beyond these [summary noun], however,...' acknowledges the previous paragraph while pivoting smoothly."),
                    w("fix-the-error", "Fix the verb agreement in the 'allowing' clause: 'Algorithmic targeting levels the playing field, allows small brands to reach nearby users.'", ["Algorithmic targeting levels the playing field, allowing small brands to reach nearby users.", "Algorithmic targeting levels the playing field, allows small brands to reach nearby users.", "Algorithmic targeting levels the playing field, allowed small brands to reach nearby users."], "Algorithmic targeting levels the playing field, allowing small brands to reach nearby users.", "Attach a result clause after a comma using the present participle (', allowing...'), not a comma-spliced finite verb."),
                ],
                genre="application letter",
                prompt="IELTS Writing Task 2 (260-340 words): 'Many websites and apps collect personal data about users in order to show them personalized advertisements and content. Do you think the advantages of this practice outweigh the disadvantages?' Write a Band 8.0 essay with zero memorized clichés, using 'Beyond these [noun], however,...' and 'These [noun]...' cohesion.",
                scaffold="outline",
                frames=[],
                word_bank=["subsidizes", "levels the playing field", "Beyond these", "pervasive", "granular", "susceptible", "amplify", "at the expense of"],
                min_words=250,
                max_words=350,
                checklist=[
                    "Open directly with the specific topic mechanism (zero 'Nowadays with the development of...' templates)",
                    "Bridge Body 1 and Body 2 using 'Beyond these [summary noun], however,...'",
                    "Use at least one ', allowing...' or ', enabling...' participle clause across 250 to 350 words",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="ielts-task2-band8-polish-2",
                title="Showcasing Band 8+ Grammatical Range: Inversion, clefts, and non-defining clauses",
                markdown=(
                    "### The Band 8.0 Grammatical Range Toolkit\n"
                    "To score Band 8.0+ in **Grammatical Range and Accuracy**, your essay needs error-free variety across complex sentence types—used naturally to highlight emphasis:\n\n"
                    "1. **Negative Inversion**: `Not only does heritage preservation anchor civic identity, but it also generates sustainable tourism revenue.`\n"
                    "2. **Parenthetical Non-Defining Clause**: `Historic shophouses—which evolved over centuries to suit tropical climates—offer lessons in passive cooling.`\n"
                    "3. **Participle Conditioning**: `Left solely to speculative developers, historic quarters quickly lose their affordability.`"
                ),
                model_text=(
                    "As rapidly growing cities modernize their skylines, municipal authorities frequently face pressure to demolish historic neighborhoods in favor of high-rise commercial towers. "
                    "While vertical redevelopment is indispensable for expanding office and housing supply in transit corridors, I contend that cities must preserve and adaptively reuse historic districts because they anchor cultural identity and foster resilient street-level economies.\n\n"
                    "Proponents of wholesale demolition argue that low-rise heritage buildings occupy prime metropolitan land inefficiently and require costly structural maintenance. "
                    "In booming financial centers, replacing a block of century-old shophouses with a forty-story mixed-use tower can multiply floor space tenfold and lower per-unit energy consumption through modern insulation.\n\n"
                    "Nevertheless, erasing architectural heritage inflicts irreversible cultural and economic damage that glass skyscrapers cannot repair. "
                    "Not only do historic quarters embody a city's collective memory across generations, but their human-scale streets also nurture independent artisans, family cafes, and cultural tourism that sterile office plazas rarely attract. "
                    "Traditional courtyard houses and arcaded shophouses—which evolved over centuries to provide shade and natural cross-ventilation in tropical climates—also offer valuable design lessons for sustainable urbanism. "
                    "Rather than treating preservation and density as mutually exclusive, forward-looking cities such as Singapore and Penang restore heritage facades for ground-floor commerce while concentrating high-density towers around suburban rail nodes. "
                    "By granting transferable development rights to property owners who maintain landmark shophouses, municipal planners can protect neighborhood character while still meeting ambitious metropolitan housing targets. In conclusion, adaptive reuse and smart zoning allow modern cities to grow upward dynamically without severing their irreplaceable historical roots."
                ),
                warmups=[
                    w("gap-fill", "Complete the negative inversion in Body Paragraph 2: 'Not only ___ historic quarters embody a city's collective memory, but they also nurture local artisans.'", ["do", "does", "are"], "do", "With plural 'historic quarters' and base verb 'embody', invert with auxiliary 'do' ('Not only do historic quarters embody...')."),
                    w("choose", "Why does the parenthetical clause '—which evolved over centuries to provide shade—' boost your IELTS score?", ["It embeds analytical context inside a non-defining relative clause without breaking flow.", "It replaces the need for a conclusion paragraph.", "It uses slang to entertain the examiner."], "It embeds analytical context inside a non-defining relative clause without breaking flow.", "Parenthetical '—which...—' clauses demonstrate effortless control of complex subordination."),
                    w("fix-the-error", "Fix the reflexive/reciprocal phrase: 'Rather than treating preservation and density as mutual exclusive, cities can combine both.'", ["Rather than treating preservation and density as mutually exclusive, cities can combine both.", "Rather than treating preservation and density as mutual exclusive, cities can combine both.", "Rather than treating preservation and density as mutual exclusively, cities can combine both."], "Rather than treating preservation and density as mutually exclusive, cities can combine both.", "Use the adverb 'mutually' to modify the adjective 'exclusive' ('mutually exclusive')."),
                ],
                genre="application letter",
                prompt="IELTS Writing Task 2 (260-340 words): 'Some people believe that old historic buildings in cities should be knocked down and replaced with modern buildings, while others think historic buildings should be preserved. Discuss both views and give your opinion.' Write a Band 8.0 essay showcasing negative inversion ('Not only do/does...'), a parenthetical '—which...—' clause, and 'mutually exclusive'.",
                scaffold="outline",
                frames=[],
                word_bank=["indispensable", "adaptively reuse", "wholesale", "irreversible", "Not only", "human-scale", "mutually exclusive", "severing"],
                min_words=250,
                max_words=350,
                checklist=[
                    "Include one accurate 'Not only do/does..., but... also...' inverted sentence",
                    "Include one non-defining relative clause set off by commas or dashes",
                    "Resolve the binary using 'Rather than treating X and Y as mutually exclusive,...' (250-350 words)",
                ],
                is_checkpoint=False,
            ),
            make_lesson(
                level="C1",
                lesson_id="ielts-task2-band8-polish-3",
                title="Checkpoint: Unassisted Band 8.0+ IELTS Task 2 Mastery Challenge",
                markdown=(
                    "### IELTS Unit 8 Checkpoint: Full Band 8.0+ Timed Essay Simulation\n"
                    "In this final IELTS Workspace checkpoint, write an unassisted 260 to 350 word Task 2 essay with **zero scaffolding** (`scaffold: 'none'`), "
                    "demonstrating full command of **Task Response**, **Coherence and Cohesion**, **Lexical Resource**, and **Grammatical Range and Accuracy**."
                ),
                model_text=(
                    "Rapid advances in artificial intelligence and robotics are automating not only routine factory assembly, but also white-collar tasks across accounting, law, and customer support. "
                    "While automation inevitably displaces workers in repetitive roles during the transition period, I contend that its long-term impact will be predominantly positive provided that governments and employers modernize adult retraining and tax policy.\n\n"
                    "Concerns over technological unemployment are understandable given the speed at which algorithmic systems now process data. "
                    "Unlike twentieth-century industrial machines that primarily replaced manual labor, generative software can draft standard contracts, audit financial ledgers, and triage routine medical scans in seconds. "
                    "Left unmanaged, this shift risks widening income inequality by rewarding capital owners and specialized AI architects while compressing wages for entry-level clerical workers.\n\n"
                    "Nevertheless, history and contemporary evidence suggest that automation ultimately elevates living standards when paired with proactive institutional adaptation. "
                    "By offloading tedious, error-prone administrative drudgery to machines, professionals in healthcare, education, and engineering can redirect their energy toward complex human judgment, creative problem solving, and empathetic patient or student care. "
                    "Furthermore, an aging global workforce makes productivity gains from automation indispensable to sustain pension systems and public services. "
                    "To ensure these productivity dividends are shared broadly, governments should fund modular mid-career reskilling grants and reform corporate tax incentives so companies are rewarded for augmenting human staff rather than merely cutting headcount. "
                    "Countries that pair industrial digitization with portable lifelong-learning accounts and wage-insurance schemes have consistently achieved both high robotic adoption and low structural unemployment. In conclusion, automation is not an uncontrollable economic fate; guided by forward-looking education and fiscal policy, it can liberate human workers from routine drudgery for higher-value creative work."
                ),
                warmups=[
                    w("choose", "What makes the passive participle opener 'Left unmanaged, this shift risks widening income inequality...' so effective at the end of Body Paragraph 1?", ["It compactly states what happens without policy action, setting up Body Paragraph 2.", "It introduces a spelling error.", "It contradicts the thesis statement."], "It compactly states what happens without policy action, setting up Body Paragraph 2.", "'Left unmanaged,' (= 'If it is left unmanaged,') is a hallmark Band 8.5 syntactic compression."),
                    w("gap-fill", "Select the precise verb meaning 'enhancing human capability rather than replacing it': '...so companies are rewarded for ___ human staff rather than cutting headcount.'", ["augmenting", "abolishing", "ignoring"], "augmenting", "'augmenting human workers' vs. 'replacing/displacing workers' is the core lexical contrast in AI essays."),
                    w("fix-the-error", "Fix the preposition after 'redirect': 'Professionals can redirect their energy in complex human judgment.'", ["Professionals can redirect their energy toward complex human judgment.", "Professionals can redirect their energy in complex human judgment.", "Professionals can redirect their energy at complex human judgment."], "Professionals can redirect their energy toward complex human judgment.", "Standard collocation: 'redirect energy/resources toward (or into) [something]'."),
                ],
                genre="application letter",
                prompt="IELTS Writing Task 2 Final Checkpoint (260-350 words): 'Artificial intelligence and automation are increasingly taking over tasks previously performed by human workers in both factories and offices. Do you think the positive effects of this trend outweigh the negative effects?' Write an unassisted Band 8.0+ essay.",
                scaffold="none",
                frames=[],
                word_bank=["inevitably", "displaces", "predominantly", "Left unmanaged", "drudgery", "redirect", "indispensable", "augmenting"],
                min_words=250,
                max_words=350,
                checklist=[
                    "State a clear, nuanced position in your opening paragraph without using memorized templates",
                    "Develop both body paragraphs with concrete mechanisms, lexical cohesion, and complex syntax",
                    "Synthesize your argument in a crisp conclusion totaling 250 to 350 words",
                ],
                is_checkpoint=True,
            ),
        ],
    ),
])


# IELTS uses task-specific bounds rather than Core CEFR bounds.
IELTS_PROCESS_MODELS = [
    "The diagram illustrates how used glass bottles are recycled into new containers. Overall, this is a repeating cycle with three broad phases: collection and preparation, crushing and melting, and production of replacement bottles. Finished containers return to beverage companies for reuse.\n\nFirst, consumers place empty bottles in local collection bins. Trucks then carry them to a sorting plant, where water jets remove labels and other residue. The clean bottles are separated into clear, green, and brown glass before entering a crusher.\n\nNext, the resulting fragments, known as cullet, are mixed with a small amount of silica sand. The mixture is heated in a furnace until it becomes liquid. This molten glass is poured into molds to form new bottles, which gradually cool on a conveyor belt. Finally, workers inspect the containers for defects before sending them to beverage producers. Collection starts the cycle again once consumers have emptied the new bottles.",
    "The maps compare Seaview in 1995 with its present layout. Overall, the town has changed from a fishing and agricultural settlement into a residential and tourist destination. The central street is now pedestrianized, while the historic cafe remains in place.\n\nIn the north, farmland has been replaced by a golf course. Part of the woodland to the northeast has also been cleared for holiday apartments and tennis courts. On the western seafront, a seafood restaurant now occupies the former fish market site, opposite the unchanged cafe. These developments have substantially reduced the area used for agriculture.\n\nAlong the southern coast, the fishing docks have become a yacht marina with a landscaped boardwalk. The former main road through the town center has been closed to vehicles and converted into a pedestrian shopping area. A new bus terminal on the eastern edge provides access to the town without requiring vehicles to enter this central zone.",
    "The maps show changes to the Harbor Industrial Precinct since 2000. Overall, industrial land has become a mixed residential and cultural district. The clock tower and northern canal basin remain, but most warehouses and storage areas have changed use.\n\nPreviously, three timber warehouses and a fenced loading bay occupied the western riverfront. The northern warehouse is now an art gallery, while the other two have been replaced by apartments with underground parking. A promenade and cycle lane occupy the former loading area, allowing public access along the river.\n\nTo the east of the clock tower, a coal yard and unused railway siding have been removed. A wetland park, outdoor cafes, and an amphitheater now occupy this land. Transport links have also improved: a pedestrian bridge crosses the southern channel, and a light-rail station stands on the northeastern boundary. Together, these changes have opened the waterfront to residents and visitors rather than restricting it to industrial users.",
]
IELTS_ESSAY_ADDITIONS = [
    "A balanced budget also needs transparent priorities. Preventive projects should be evaluated against measurable health outcomes, while hospitals need sufficient reserves to handle unexpected demand. Funding one approach should therefore complement, rather than eliminate, the other part of a resilient health service.",
    "Exemptions also require careful design. Emergency vehicles and residents with disabilities may need special arrangements, but broad exceptions would weaken the incentive to change travel habits. Authorities should publish regular reports showing whether shorter journeys and better services actually justify the charge.",
    "Schools should also offer accessible alternatives for students with disabilities or caring duties, ensuring that participation remains fair and educational rather than punitive.",
    "Public oversight is essential to this argument. Residents should see realistic maintenance budgets before a bid is approved, and independent reviews should compare projected benefits with alternative uses of the same funds.",
    "Financial inclusion must nevertheless remain a practical commitment. Community training and accessible account services would help people who cannot navigate complex applications. Without these measures, efficiency gains for confident users could conceal substantial costs for others.",
    "This does not mean rejecting development. Instead, governments should compare immediate gains with environmental costs and require firms to prevent damage before projects receive approval.",
]
for unit in IELTS_UNITS:
    for index, lesson in enumerate(unit["lessons"]):
        task = lesson["task"]
        task["minWords"], task["maxWords"] = (250, 350) if "task2-" in unit["id"] else (150, 180)
        task["prompt"] = re.sub(r"\d{3}[-–]\d{3} words", f"{task['minWords']}-{task['maxWords']} words", task["prompt"])
        if unit["id"] == "ielts-task1-processes-maps":
            lesson["miniLesson"]["modelText"] = IELTS_PROCESS_MODELS[index]
        if unit["id"] in ("ielts-task2-opinion-essays", "ielts-task2-discussion-essays"):
            offset = 0 if "opinion" in unit["id"] else 3
            lesson["miniLesson"]["modelText"] += "\n\n" + IELTS_ESSAY_ADDITIONS[offset + index]

# ============================================================================
# STRICT ZOD-EQUIVALENT VALIDATOR (Mirrors `src/lib/curriculum.ts`)
# ============================================================================

def count_words(text: str) -> int:
    return len(text.split())


def validate_curriculum(units: list[dict[str, Any]], label: str) -> list[str]:
    """Validate a curriculum array against every rule in `src/lib/curriculum.ts`."""
    errors: list[str] = []

    if not isinstance(units, list):
        return [f"[{label}] Root must be a list of units"]
    if not (3 <= len(units) <= 60):
        errors.append(f"[{label}] Unit count {len(units)} outside 3..60")

    seen_ids: set[str] = set()
    unit_keys = {"id", "level", "order", "title", "theme", "outcome", "grammarFocus", "vocabulary", "lessons"}
    lesson_keys = {"id", "title", "miniLesson", "warmups", "task"}
    mini_keys = {"markdown", "modelText"}
    warmup_keys_req = {"type", "prompt", "answer", "hint"}
    warmup_keys_all = {"type", "prompt", "options", "answer", "hint"}
    task_keys_req = {
        "id", "title", "genre", "prompt", "scaffold",
        "wordBank", "checklist", "minWords", "maxWords", "isCheckpoint", "targetLevel"
    }
    task_keys_all = task_keys_req | {"frames"}

    for u in units:
        uid = u.get("id", "<missing>")
        if set(u.keys()) != unit_keys:
            errors.append(f"[{label}] Unit {uid} strict keys mismatch: {set(u.keys()) ^ unit_keys}")
        if not isinstance(uid, str) or not ID_REGEX.match(uid):
            errors.append(f"[{label}] Invalid unit.id: {uid}")
        if uid in seen_ids:
            errors.append(f"[{label}] Duplicate content id: {uid}")
        seen_ids.add(uid)

        level = u.get("level")
        if level not in COURSE_RANGES:
            errors.append(f"[{label}] Unit {uid} invalid level: {level}")
            continue
        lo, hi = COURSE_RANGES[level]

        order = u.get("order")
        if not isinstance(order, int) or not (1 <= order <= 20):
            errors.append(f"[{label}] Unit {uid} invalid order: {order}")

        for field, max_len in [("title", 150), ("theme", 150), ("outcome", 300)]:
            val = u.get(field, "")
            if not isinstance(val, str) or not (1 <= len(val) <= max_len):
                errors.append(f"[{label}] Unit {uid}.{field} invalid length {len(str(val))}")

        gf = u.get("grammarFocus", [])
        if not isinstance(gf, list) or not (1 <= len(gf) <= 5) or any(tag not in VALID_ERROR_TAGS for tag in gf):
            errors.append(f"[{label}] Unit {uid}.grammarFocus invalid: {gf}")

        vocab = u.get("vocabulary", [])
        if not isinstance(vocab, list) or len(vocab) > 20 or any(not isinstance(v, str) or len(v) > 100 for v in vocab):
            errors.append(f"[{label}] Unit {uid}.vocabulary invalid")

        lessons = u.get("lessons", [])
        if not isinstance(lessons, list) or not (1 <= len(lessons) <= 6):
            errors.append(f"[{label}] Unit {uid}.lessons count invalid: {len(lessons)}")

        for l in lessons:
            lid = l.get("id", "<missing>")
            if set(l.keys()) != lesson_keys:
                errors.append(f"[{label}] Lesson {lid} strict keys mismatch: {set(l.keys()) ^ lesson_keys}")
            if not isinstance(lid, str) or not ID_REGEX.match(lid):
                errors.append(f"[{label}] Invalid lesson.id: {lid}")
            if lid in seen_ids:
                errors.append(f"[{label}] Duplicate content id: {lid}")
            seen_ids.add(lid)

            ltitle = l.get("title", "")
            if not isinstance(ltitle, str) or not (1 <= len(ltitle) <= 150):
                errors.append(f"[{label}] Lesson {lid}.title invalid length")

            mini = l.get("miniLesson", {})
            if set(mini.keys()) != mini_keys:
                errors.append(f"[{label}] Lesson {lid}.miniLesson strict keys mismatch")
            md = mini.get("markdown", "")
            mt = mini.get("modelText", "")
            if not (1 <= len(md) <= 3000):
                errors.append(f"[{label}] Lesson {lid}.miniLesson.markdown length {len(md)} outside 1..3000")
            if not (1 <= len(mt) <= 6500):
                errors.append(f"[{label}] Lesson {lid}.miniLesson.modelText length {len(mt)} outside 1..6500")

            words = count_words(mt)
            model_lo, model_hi = (l["task"]["minWords"], l["task"]["maxWords"])
            if not (model_lo <= words <= model_hi):
                errors.append(
                    f"[{label}] Lesson {lid} ({level}) modelText word count {words} outside task range {model_lo}..{model_hi}"
                )

            warmups = l.get("warmups", [])
            if not isinstance(warmups, list) or not (2 <= len(warmups) <= 6):
                errors.append(f"[{label}] Lesson {lid}.warmups count {len(warmups)} outside 2..6")
            for idx, witem in enumerate(warmups):
                wkeys = set(witem.keys())
                if not warmup_keys_req.issubset(wkeys) or not wkeys.issubset(warmup_keys_all):
                    errors.append(f"[{label}] Lesson {lid} warmup[{idx}] invalid keys {wkeys}")
                if witem.get("type") not in VALID_WARMUP_TYPES:
                    errors.append(f"[{label}] Lesson {lid} warmup[{idx}] invalid type {witem.get('type')}")
                if not (1 <= len(witem.get("prompt", "")) <= 500):
                    errors.append(f"[{label}] Lesson {lid} warmup[{idx}] prompt length invalid")
                if not (1 <= len(witem.get("answer", "")) <= 300):
                    errors.append(f"[{label}] Lesson {lid} warmup[{idx}] answer length invalid")
                if not (1 <= len(witem.get("hint", "")) <= 300):
                    errors.append(f"[{label}] Lesson {lid} warmup[{idx}] hint length invalid")
                opts = witem.get("options")
                if opts is not None:
                    if not isinstance(opts, list) or len(opts) > 8 or any(len(o) > 100 for o in opts):
                        errors.append(f"[{label}] Lesson {lid} warmup[{idx}] options invalid")

            task = l.get("task", {})
            tkeys = set(task.keys())
            if not task_keys_req.issubset(tkeys) or not tkeys.issubset(task_keys_all):
                errors.append(f"[{label}] Lesson {lid}.task invalid keys {tkeys}")
            tid = task.get("id", "<missing>")
            if not isinstance(tid, str) or not ID_REGEX.match(tid):
                errors.append(f"[{label}] Invalid task.id: {tid}")
            if tid in seen_ids:
                errors.append(f"[{label}] Duplicate content id: {tid}")
            seen_ids.add(tid)

            if not (1 <= len(task.get("title", "")) <= 150):
                errors.append(f"[{label}] Task {tid}.title invalid")
            if not (1 <= len(task.get("genre", "")) <= 80):
                errors.append(f"[{label}] Task {tid}.genre invalid")
            if not (1 <= len(task.get("prompt", "")) <= 1000):
                errors.append(f"[{label}] Task {tid}.prompt invalid")
            scaffold = task.get("scaffold")
            if scaffold not in VALID_SCAFFOLDS:
                errors.append(f"[{label}] Task {tid}.scaffold invalid: {scaffold}")
            frames = task.get("frames", [])
            if scaffold == "frames" and (not frames or len(frames) == 0):
                errors.append(f"[{label}] Task {tid} uses 'frames' scaffold but provides none")
            if frames and (len(frames) > 6 or any(len(f) > 300 for f in frames)):
                errors.append(f"[{label}] Task {tid}.frames invalid")
            wb = task.get("wordBank", [])
            if not isinstance(wb, list) or len(wb) > 12 or any(len(w_str) > 100 for w_str in wb):
                errors.append(f"[{label}] Task {tid}.wordBank invalid")
            cl = task.get("checklist", [])
            if not isinstance(cl, list) or not (1 <= len(cl) <= 5) or any(len(c_str) > 200 for c_str in cl):
                errors.append(f"[{label}] Task {tid}.checklist invalid")
            min_w = task.get("minWords", 0)
            max_w = task.get("maxWords", 0)
            if not (5 <= min_w <= 500) or not (5 <= max_w <= 500) or min_w > max_w:
                errors.append(f"[{label}] Task {tid} word bounds invalid: {min_w}..{max_w}")
            if not isinstance(task.get("isCheckpoint"), bool):
                errors.append(f"[{label}] Task {tid}.isCheckpoint not bool")
            if task.get("targetLevel") not in COURSE_RANGES:
                errors.append(f"[{label}] Task {tid}.targetLevel invalid")

    return errors


def sort_units(units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(units, key=lambda u: (LEVEL_ORDER.index(u["level"]), u["order"]))


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Zod-validated Writing Coach curricula.")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("curriculum"),
        help="Output directory for course.draft.json and ielts.draft.json (default: curriculum/)",
    )
    parser.add_argument(
        "--include-ielts-in-core",
        action="store_true",
        help="Also append IELTS units directly into course.draft.json (29 units total).",
    )
    args = parser.parse_args()

    core_sorted = sort_units(CORE_UNITS)
    ielts_sorted = sort_units(IELTS_UNITS)
    combined_sorted = sort_units(CORE_UNITS + IELTS_UNITS)

    core_errors = validate_curriculum(core_sorted, "course.draft.json")
    ielts_errors = validate_curriculum(ielts_sorted, "ielts.draft.json")
    combined_errors = validate_curriculum(combined_sorted, "combined")

    all_errors = core_errors + ielts_errors + combined_errors
    if all_errors:
        for err in all_errors:
            print(f"VALIDATION ERROR: {err}", file=sys.stderr)
        return 1

    args.out_dir.mkdir(parents=True, exist_ok=True)
    core_target = combined_sorted if args.include_ielts_in_core else core_sorted

    core_path = args.out_dir / "course.draft.json"
    ielts_path = args.out_dir / "ielts.draft.json"

    core_path.write_text(json.dumps(core_target, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ielts_path.write_text(json.dumps(ielts_sorted, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    core_lessons = sum(len(u["lessons"]) for u in core_target)
    ielts_lessons = sum(len(u["lessons"]) for u in ielts_sorted)
    print(
        f"Successfully generated and Python-validated (run Zod validation separately):\n"
        f"  - {core_path}: {len(core_target)} units / {core_lessons} lessons\n"
        f"  - {ielts_path}: {len(ielts_sorted)} units / {ielts_lessons} lessons\n"
        f"  - Combined uniqueness & modelText word-range checks: 100% PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
