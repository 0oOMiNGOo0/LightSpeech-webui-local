import os
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

    output_directory = '../frontend/public/output'
    data = []
    for i in os.listdir('output/wavs'):
        w = wave.open('output/wavs/' + i, 'rb')
        data.append([w.getparams(), w.readframes(w.getnframes())])
        w.close()
    output_file = output_directory + '/' + name.replace('.txt', '.wav')
    full_wav = wave.open(output_file, 'wb')
    full_wav.setparams(data[0][0])
    for i in range(len(data)):
        full_wav.writeframes(data[i][1])
    full_wav.close()

    os.makedirs(output_directory, exist_ok=True)

    output_paths = [x for x in os.listdir(output_directory) if 'wav' in x]
    sio.emit('downloads', output_paths)
    sio.send({})
    sio.sleep(0)
    os.remove('inference_text.txt')
    return

sio.run(app, host='0.0.0.0', port=5050, debug=True)