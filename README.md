# Goal of Plugin

This Plugin aims to give users better experience in linking thier notes while writing note.

In Obsidian, we need to open `[[` double brackets to indicate internal linking. While it's reasonable to limit suggestion on `[[` to minimize unnecessary suggestions, It would be helpful to automatically detect keywords and notes with user defined condition, such as notes under certain directories.

In inital design, this Plugin uses TRIE to support quick response. This TRIE object is loaded on plugin loading and updated based on **rename** or **modify**.
