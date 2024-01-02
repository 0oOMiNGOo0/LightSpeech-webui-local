import os
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
    content = request.files['uploadFile']
    content.save('inference_text.txt')
    return jsonify({'test': 'ok'})

@app.route('/remove', methods=['POST'])
def AS():
    os.remove('inference_text.txt')
    return jsonify({'test': 'ok'})

@sio.on('uploaded')
def handle_message():
    command = "python lightspeech_inference.py --config configs/tts/lj/lightspeech.yaml --exp_name lightspeech --reset --inference_text inference_text.txt"
    subprocess.run(command, shell=True)
    sio.send({'current':100, 'total': 100})

    output_directory = '../frontend/public/output'

    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    for i in os.listdir('output/wavs'):
        if os.path.exists(output_directory + f'/{i}'):
            os.replace(f'output/wavs/{i}', output_directory + f'/{i}')
        else:
            os.rename(f'output/wavs/{i}', output_directory + f'/{i}')
    output_paths = [x for x in os.listdir(output_directory) if 'wav' in x]
    sio.emit('downloads', output_paths)
    os.remove('inference_text.txt')
    return

sio.run(app, host='0.0.0.0', port=5050, debug=True)