const fs = require('fs');
const youtubedl = require('youtube-dl');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

let youtubeDownloader = {
    url: null,
    quality: 0,
    finalOutput: null,
    videoFileName: null,
    audioFileName: null,
    videoTag: null,
    audioTag: null,
    downloader(tag) {
        let download = youtubedl(this.url,
        ['-f', tag], { cwd: __dirname });

        return download
    },
    downloadVideo () {
        let size = 0
        let pos = 0

        let d = this.downloader(this.videoTag)
        d.on('info', (info) => {
            console.log('Video Download started');
            console.log('size: ' + info.size);
            size = info.size;

            this.finalOutput = path.join(__dirname, info._filename)
            this.videoFileName = path.join(__dirname, info.size.toString() + "." + info.ext)
            d.pipe(fs.createWriteStream(this.videoFileName));
        });

        d.on('data', function data(chunk) {
            pos += chunk.length;

            if (size) {
                var percent = (pos / size * 100).toFixed(2);
                process.stdout.cursorTo(0);
                process.stdout.clearLine(1);
                process.stdout.write(percent + '%');
            }
        });

        return d;
    },
    downloadAudio() {
        let size = 0
        let pos = 0

        let d = this.downloader(this.audioTag)
        d.on('info', (info) => {
            console.log('Audio Download started');
            console.log('size: ' + info.size);
            size = info.size;

            this.audioFileName = path.join(__dirname, info.size.toString() + "." + info.ext)
            d.pipe(fs.createWriteStream(this.audioFileName));
        });

        d.on('data', function data(chunk) {
            pos += chunk.length;

            if (size) {
                var percent = (pos / size * 100).toFixed(2);
                process.stdout.cursorTo(0);
                process.stdout.clearLine(1);
                process.stdout.write(percent + '%');
            }
        });

        return d;
    },
    checkFileTag(callback) {
        youtubedl.getInfo(this.url, (err, info) => {
            if (err) { throw err; }
            for (let index in info.formats) {
                ((index, format) => {
                    if (format.ext === "mp4" && !format.resolution) {
                        if (format.height.toString() === this.quality) {
                            this.videoTag = format.format_id
                        }
                    }
                    if (format.ext === "m4a" && !format.resolution) {
                        this.audioTag = format.format_id
                    }
                })(index, info.formats[index])
            }
            callback()
        });
    },
    start(u, q) {
        this.url = u
        this.quality = q
        this.checkFileTag(() => {
            this.downloadVideo().on("end", () => {
                this.downloadAudio().on("end", () => {
                    console.log('\nFinish Dowloading, processing...');
                    ffmpeg.setFfmpegPath(ffmpegPath);
                    let command = ffmpeg(this.videoFileName).videoCodec('copy').input(this.audioFileName).audioCodec('copy').saveToFile(this.finalOutput)

                    command.on('end', () => {
                        fs.unlink(this.videoFileName, () => {});
                        fs.unlink(this.audioFileName, () => {});
                        console.log('Finished processing');
                    })
                })
            })
        })
       
    }
}

youtubeDownloader.start('https://www.youtube.com/watch?v=KpiQ9lI5aWc', '1080')
