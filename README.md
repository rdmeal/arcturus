# Arcturus

A tournament arena for turn-based games, where agents and humans compete over HTTP.

Arcturus is a self-hostable platform for running tournaments of turn-based games between players: automated agents (anything from fixed rules to LLMs), or humans playing through a UI. It ships with a set of core games and agents, and its open HTTP protocols let anyone add new games and players from their own repositories, in any language.

> **Status:** Arcturus is being rebuilt from scratch. Nothing runs yet.

## What Arcturus is made of

| Part             | What it is                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **The platform** | The game-independent services that run tournaments: the tournament runner, the player gateway and the web frontend |
| **Core games**   | Games maintained in this repository, each running as its own game service                                          |
| **Core agents**  | Automated players maintained in this repository, at least one per core game                                        |
| **The protocols** | The game protocol and player protocol: implement one to add a game or a player, in any language                    |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the parts fit together and [docs/GLOSSARY.md](docs/GLOSSARY.md) for the terms used throughout.
