import * as cron from 'node-cron'
import * as pathResolve from 'path';
import * as fs from 'fs';
import { getRepository } from 'typeorm';
import { User } from './entities/User';
import { getWorld } from './routes/Pix/controller';
import { canvases } from './utils/constants';

function dailyRanking() {
  const userRepository = getRepository(User);
  const world = getWorld();

  world.resetDaily();
  userRepository.update({}, { dailyPixels: 0 });
}

function saveHistory() {
    const date = new Date();
    const dateString = date.toLocaleDateString('fr-FR').replace(/\//g, '-');
    const timeString = date.toLocaleTimeString('fr-FR').replace(/:/g, '-').replace(/-..$/, '');

    console.info('[HISTORY] Begin Saving');
    canvases.forEach(({ id }) => {
        console.info('[HISTORY] Saving', id);
        const pathDir =  pathResolve.resolve(`./chunks/${id}/history/${dateString}/${timeString}`);
        const pathHistoryData = pathResolve.resolve(`./chunks/${id}/history/saves.json`);

        const historyData: Array<{ date: string, saves: Array<string>}> = fs.existsSync(pathHistoryData) ? JSON.parse(fs.readFileSync(pathHistoryData).toString()) : [];
        const lastSave = new Date((() => {
            if (historyData.length === 0)
                return 0;
            const last = historyData[historyData.length -1];
            const lastDate = last.date.split('-');
            return `${lastDate[1]}-${lastDate[0]}-${lastDate[2]} ${last.saves[last.saves.length - 1].replace(/-/g, ':')}`
        })());

        let haveSavedChunks = false;

        if (!fs.existsSync(pathDir))
            fs.mkdirSync(pathDir, { recursive: true });

        const path = pathResolve.resolve(`./chunks/${id}/fg`);
        const xDirs = fs.readdirSync(pathResolve.resolve(path));
        xDirs.forEach((x) => {
            const pathX = `${path}/${x}`;
            const yFiles = fs.readdirSync(pathX);
            yFiles.forEach((y) => {
                const pathY = `${pathX}/${y}`;
                const stat = fs.statSync(pathY);
                if (stat.isFile() && lastSave < stat.mtime) {
                    haveSavedChunks = true;
                    if (!fs.existsSync(`${pathDir}/${x}`))
                        fs.mkdirSync(`${pathDir}/${x}`, { recursive: true });
                    fs.copyFileSync(pathY, `${pathDir}/${x}/${y}`);
                }
            });
        });

        if (haveSavedChunks) {
            const exists = historyData.findIndex((e) => e.date === dateString);
            if (exists !== -1) {
                historyData[exists].saves.push(timeString);
            } else {
                historyData.push({
                    date: dateString,
                    saves: [ timeString ]
                });
            }
        } else {
            fs.rmdirSync(pathDir);
        }
        console.info('[HISTORY] Finished saving', id);
        fs.writeFileSync(pathHistoryData, JSON.stringify(historyData));
    });
}

export function setupCrons() {
    cron.schedule('0 0 * * *', dailyRanking);
    cron.schedule('0 */12 * * *', saveHistory);
}
