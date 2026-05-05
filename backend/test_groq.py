import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
try:
    client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
    response = client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[
            {'role': 'system', 'content': 'You are a test. Reply with JSON {"status": "safe"}'},
            {'role': 'user', 'content': 'hello'}
        ],
        response_format={'type': 'json_object'}
    )
    print('SUCCESS:', response.choices[0].message.content)
except Exception as e:
    print('ERROR:', type(e).__name__, str(e))
