import {
  ArrowRightIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Icon } from '@tremor/react';
import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Axios from 'axios';
import { Socket, io } from 'socket.io-client';
import { List, ListItem } from '@tremor/react';

type UploadedFileType = {
  file: File;
  uploaded: boolean;
};

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFileType[] | null>(
    null
  );
  const [outputFilePaths, setOutputFilePaths] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState<{
    key: 0 | 1;
    current: number;
    total: number;
  } | null>(null);

  const onFileUploadHandler = async (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.currentTarget;

    if (files) {
      const uploadedFile = Array.from(files).map((file) => ({
        uploaded: false,
        file,
      }));

      await Promise.all([
        uploadedFile.map(async (f) => {
          const formData = new FormData();
          formData.append('uploadFile', f.file);

          const { status } = await Axios.post(
            'http://localhost:5050/uploaded',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              responseType: 'blob',
            }
          );

          if (status === 200) {
            setUploadedFile((prevUploadedFile) => {
              const sData = uploadedFile.map((x) => {
                if (x.file === f.file) {
                  x.uploaded = true;
                  return x;
                } else {
                  return x;
                }
              });

              return sData;
            });
          }
        }),
      ]);
    }
  };

  useEffect(() => {
    const socket = io('http://localhost:5050', {
      transports: ['websocket'],
    });
    // log socket connection
    socket.on('connect', () => {
      console.log('CONNECTED');
      setSocket(socket);
    });

    socket.on('message', (message) => {
      console.log(message);
      setProgress({
        key: message.key,
        total: message.total,
        current: message.current,
      });
    });

    socket.on('downloads', (message: string[]) => {
      console.log(message);
      setOutputFilePaths(message);
    });

    socket.on('end', () => {
      console.log('EXIT');
    });

    // socket disconnect on component unmount if exists
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const onSubmitHandler = (e: FormEvent) => {
    e.preventDefault();

    setOutputFilePaths([]);
    if (socket) {
      setProgress({
        key: 0,
        total: 100,
        current: 0,
      });
      socket.emit('uploaded');
      setUploadedFile(null);
    }
  };

  useEffect(() => {
    console.log(progress);
  }, [progress]);

  return (
    <main className='flex justify-center p-4 gap-4 max-w-7xl w-full m-auto'>
      <form
        className='bg-white w-500 h-500 flex flex-col gap-4  max-w-[410px]'
        onSubmit={onSubmitHandler}
      >
        <div className=''>
          <span className='text-md'>업로드</span>
          <ul className='border rounded px-2 py-2 bg-gray-50 flex flex-col gap-2 h-80 mt-2 relative overflow-auto'>
            {uploadedFile?.map((file, i) => (
              <li
                key={i}
                className='flex border rounded py-2 px-4 gap-3 bg-white'
              >
                <Icon
                  icon={FolderIcon}
                  variant='solid'
                  color={file.uploaded ? 'blue' : 'red'}
                />
                <div className='flex flex-col justify-center'>
                  <span className='text-[13px] leading-[15px] text-black font-medium max-w-[250px] whitespace-pre overflow-hidden text-ellipsis'>
                    {file?.file.name}
                  </span>
                  <span className='text-[11px] font-light'>
                    {file.uploaded ? '업로드 완료' : '업로드 중...'}
                  </span>
                </div>
                <Button
                  className='py-1 px-3 h-8 my-auto ml-auto'
                  variant='secondary'
                  color='red'
                  type='button'
                  onClick={async () => {
                    const data = Axios.post('http://localhost:5050/remove', {
                      fileName: file.file.name,
                    });

                    if ((await data).status === 200) {
                      setUploadedFile(
                        (prevUploadedFile) =>
                          prevUploadedFile?.filter(
                            (x) => x.file != file.file
                          ) ?? null
                      );
                    }
                  }}
                >
                  삭제
                </Button>
              </li>
            ))}
            <li
              className='border rounded py-2 bg-white text-sm text-center sticky bottom-0 right-2 left-2'
              style={{
                boxShadow: '0px -6px 20px 0px #000000e;',
              }}
            >
              <label
                htmlFor='fileArea'
                className='whitespace-nowrap w-[250px] flex gap-1 justify-center'
              >
                <PlusCircleIcon className='w-4' />
                파일 업로드
                <input
                  id='fileArea'
                  type='file'
                  hidden
                  onChange={onFileUploadHandler}
                  required
                  name='fileList'
                />
              </label>
            </li>
          </ul>
        </div>
        <Button disabled={!uploadedFile} type='submit'>
          실행
        </Button>
      </form>
      <div className='w-2/5 bg-gray-50 rounded relative overflow-hidden'>
        {outputFilePaths.length > 0 && (
          <List className='p-2'>
            {outputFilePaths.map((path, i) => (
              <a
                href={'/output/' + path}
                download={path}
                key={i}
              >
                <ListItem className='flex gap-2 justify-start t text-black text-xs py-1.5 underline'>
                  <FolderOpenIcon color='black' className='min-w-[1rem] w-4' />
                  <span className='whitespace-pre overflow-hidden text-ellipsis w-[80%]'>
                    {path}
                  </span>
                </ListItem>
              </a>
            ))}
          </List>
        )}

        {progress ? (
          <div>
            {progress.current < 100 && (
              <div className='absolute right-0 left-0 top-0 bottom-0 flex items-center justify-center flex-col gap-2'>
                <div className='text-center'>
                  <div role='status'>
                    <svg
                      aria-hidden='true'
                      className='inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600'
                      viewBox='0 0 100 101'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
                        fill='currentColor'
                      />
                      <path
                        d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
                        fill='currentFill'
                      />
                    </svg>
                    <span className='sr-only'>Loading...</span>
                  </div>
                </div>
                <span className='flex text-xs text-gray-700 font-medium'>
                  {progress.current == 100
                    ? '처리 완료 ✅'
                    : '처리 중입니다...'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <Image
            src='/logo.png'
            width={200}
            height={50}
            className='absolute right-0 left-0 top-0 bottom-0 m-auto invert opacity-25'
            alt='logo'
          />
        )}
      </div>
    </main>
  );
}
