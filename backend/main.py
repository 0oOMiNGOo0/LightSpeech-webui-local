import os
import re
import wave
import asyncio
import eventlet
import subprocess
from flask_cors import CORS
from flask_socketio import SocketIO
from flask import Flask, jsonify, request, send_file

app = Flask(__name__)
sio = SocketIO(app, cors_allowed_origins='*')
CORS(app)

@app.route('/uploaded', methods=['POST'])
def GETC():
    global name
    params = request.form
    content = request.files['uploadFile']
    name = params['fileName']
    print(name)
    content.save('inference_text.txt')
    return jsonify({'test': 'ok'})

@app.route('/remove', methods=['POST'])
def AS():
    os.remove('inference_text.txt')
    return jsonify({'test': 'ok'})

@sio.on('uploaded')
def handle_message():
    sio.send({'current': 0})
    sio.sleep(0)
    command = "python lightspeech_inference.py --config configs/tts/lj/lightspeech.yaml --exp_name lightspeech --reset --inference_text inference_text.txt"
    subprocess.run(command, shell=True)
    sio.send({'current':100, 'total': 100})
    sio.sleep(0)

    output_directory = 'output'
    os.makedirs(output_directory, exist_ok=True)
    name = 'test.txt'

    def extract_number(filename):
        match = re.search(r'\[P\]\[(\d+)\]', filename)
        if match:
            return int(match.group(1))
        return float('inf')

    data = []
    for i in sorted(os.listdir('output/wavs'), key=extract_number):
        w = wave.open('output/wavs/' + i, 'rb')
        data.append([w.getparams(), w.readframes(w.getnframes())])
        w.close()
    output_file = output_directory + '/' + name.replace('.txt', '.wav')
    full_wav = wave.open(output_file, 'wb')
    full_wav.setparams(data[0][0])
    for i in range(len(data)):
        full_wav.writeframes(data[i][1])
    full_wav.close()

    output_paths = [x for x in os.listdir(output_directory) if 'wav' in x]
    sio.emit('downloads', output_paths)
    sio.send({})
    sio.sleep(0)
    os.remove('inference_text.txt')
    return

sio.run(app, host='0.0.0.0', port=5050, debug=True)
