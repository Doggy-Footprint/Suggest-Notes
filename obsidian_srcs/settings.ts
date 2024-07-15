import { PluginSettingTab, Setting, App } from 'obsidian';
import KeywordSuggestPlugin from './main'

export interface KeywordSuggestPluginSettings {
    useDirectories: boolean,
    searchDirectories: string[],
    useTags: boolean,
    checkTags: string[]
}

export const DEFAULT_SETTINGS: KeywordSuggestPluginSettings = {
    useDirectories: true,
    searchDirectories: [],
    useTags: true,
    checkTags: []
}

export class KeywordSuggestPluginSettingTab extends PluginSettingTab {
    plugin: KeywordSuggestPlugin

    display() {
        let { containerEl } = this;
        
        containerEl.empty();

        new Setting(containerEl)
            .setName('Use Directories')
            .setDesc('Use directories to register notes as linkable.')
            .addToggle(cb => {
                cb.setValue(this.plugin.settings.useDirectories)
                    .onChange(async value => {
                        this.plugin.settings.useDirectories = value;
                        await this.plugin.saveSettings();
                    })
            });
        
        if (this.plugin.settings.useDirectories) {
            new Setting(containerEl)
                .setName('Paths of directories')
                .setDesc('Select paths of directories(use ; to separate)')
                .setClass('ks-sub-setting')
                .addText(cb => {
                    cb.setPlaceholder(`path/to/dir1;path/to/dir2`)
                        .setValue(this.plugin.settings.searchDirectories.join(';'))
                        .onChange(async value => {
                            this.plugin.settings.searchDirectories = value.split(';');
                            await this.plugin.saveSettings();
                        });
                });
        }
        
        new Setting(containerEl)
            .setName('Use Tags')
            .setDesc('Use tags to register notes as linkable')
            .addToggle(setting => {
                setting.setValue(this.plugin.settings.useTags)
                    .onChange(async value => {
                        this.plugin.settings.useDirectories = value;
                        await this.plugin.saveSettings();
                    })
            });

        if (this.plugin.settings.useTags) {
                new Setting(containerEl)
                    .setName('Define Tags')
                    .setDesc('List tags(use ; to separate)')
                    .setClass('ks-sub-setting')
                    .addText(cb => {
                        cb.setPlaceholder(`tag1;tag2`)
                            .setValue(this.plugin.settings.checkTags.join(';'))
                            .onChange(async value => {
                                this.plugin.settings.checkTags = value.split(';');
                                await this.plugin.saveSettings();
                            });
                    });
            }
    }

}